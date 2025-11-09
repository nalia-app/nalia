
import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '@/app/integrations/supabase/client';
import type { User as SupabaseUser } from '@supabase/supabase-js';
import type { Tables } from '@/app/integrations/supabase/types';

interface User {
  id: string;
  name: string;
  email: string;
  bio: string;
  photoUri?: string;
  interests: string[];
}

interface UserContextType {
  user: User | null;
  isOnboarded: boolean;
  isLoading: boolean;
  session: any;
  setUser: (user: User | null) => void;
  completeOnboarding: () => void;
  updateProfile: (updates: Partial<User>) => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const UserContext = createContext<UserContextType | undefined>(undefined);

export function UserProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isOnboarded, setIsOnboarded] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [session, setSession] = useState<any>(null);

  useEffect(() => {
    console.log('[UserContext] Initializing...');
    
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      console.log('[UserContext] Initial session:', session?.user?.id);
      setSession(session);
      if (session?.user) {
        loadUserProfile(session.user.id);
      } else {
        setIsLoading(false);
      }
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      console.log('[UserContext] Auth state changed:', _event, session?.user?.id);
      setSession(session);
      if (session?.user) {
        loadUserProfile(session.user.id);
      } else {
        setUser(null);
        setIsOnboarded(false);
        setIsLoading(false);
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const loadUserProfile = async (userId: string) => {
    try {
      console.log('[UserContext] Loading profile for user:', userId);
      
      // Get profile - use maybeSingle() instead of single() to handle missing profiles
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .maybeSingle();

      if (profileError) {
        console.error('[UserContext] Error loading profile:', profileError);
        setIsLoading(false);
        return;
      }

      if (!profile) {
        console.log('[UserContext] No profile found, user needs onboarding');
        setIsOnboarded(false);
        setIsLoading(false);
        return;
      }

      // Get interests
      const { data: interests, error: interestsError } = await supabase
        .from('interests')
        .select('interest')
        .eq('user_id', userId);

      if (interestsError) {
        console.error('[UserContext] Error loading interests:', interestsError);
      }

      // Get email from auth user
      const { data: { user: authUser } } = await supabase.auth.getUser();

      const userData: User = {
        id: profile.id,
        name: profile.name,
        email: authUser?.email || '',
        bio: profile.bio || '',
        photoUri: profile.avatar_url || undefined,
        interests: interests?.map(i => i.interest) || [],
      };

      console.log('[UserContext] User profile loaded:', userData.name);
      setUser(userData);
      setIsOnboarded(true);
      setIsLoading(false);
    } catch (error) {
      console.error('[UserContext] Error in loadUserProfile:', error);
      setIsLoading(false);
    }
  };

  const refreshUser = async () => {
    if (session?.user) {
      await loadUserProfile(session.user.id);
    }
  };

  const completeOnboarding = async () => {
    console.log('[UserContext] Completing onboarding');
    setIsOnboarded(true);
    if (session?.user) {
      await loadUserProfile(session.user.id);
    }
  };

  const updateProfile = async (updates: Partial<User>) => {
    if (!user || !session?.user) {
      console.error('[UserContext] Cannot update profile: no user or session');
      return;
    }
    
    console.log('[UserContext] Updating profile:', updates);
    
    try {
      // Update profile table
      const profileUpdates: any = {};
      if (updates.name !== undefined) profileUpdates.name = updates.name;
      if (updates.bio !== undefined) profileUpdates.bio = updates.bio;
      if (updates.photoUri !== undefined) profileUpdates.avatar_url = updates.photoUri;

      if (Object.keys(profileUpdates).length > 0) {
        const { error: profileError } = await supabase
          .from('profiles')
          .update(profileUpdates)
          .eq('id', user.id);

        if (profileError) {
          console.error('[UserContext] Error updating profile:', profileError);
          throw profileError;
        }
      }

      // Update interests if provided
      if (updates.interests !== undefined) {
        // Delete existing interests
        await supabase
          .from('interests')
          .delete()
          .eq('user_id', user.id);

        // Insert new interests
        if (updates.interests.length > 0) {
          const interestsToInsert = updates.interests.map(interest => ({
            user_id: user.id,
            interest,
          }));

          const { error: interestsError } = await supabase
            .from('interests')
            .insert(interestsToInsert);

          if (interestsError) {
            console.error('[UserContext] Error updating interests:', interestsError);
            throw interestsError;
          }
        }
      }

      // Update local state
      const updatedUser = { ...user, ...updates };
      setUser(updatedUser);
      console.log('[UserContext] Profile updated successfully');
    } catch (error) {
      console.error('[UserContext] Error updating profile:', error);
      throw error;
    }
  };

  const logout = async () => {
    console.log('[UserContext] Logging out');
    try {
      await supabase.auth.signOut();
      setUser(null);
      setIsOnboarded(false);
      setSession(null);
    } catch (error) {
      console.error('[UserContext] Error logging out:', error);
      throw error;
    }
  };

  return (
    <UserContext.Provider
      value={{
        user,
        isOnboarded,
        isLoading,
        session,
        setUser,
        completeOnboarding,
        updateProfile,
        logout,
        refreshUser,
      }}
    >
      {children}
    </UserContext.Provider>
  );
}

export function useUser() {
  const context = useContext(UserContext);
  if (context === undefined) {
    throw new Error('useUser must be used within a UserProvider');
  }
  return context;
}
