// /**
//  * User Context - Manages user authentication and user_id
//  * For now, uses a mock user_id stored in localStorage
//  * TODO: Replace with real authentication when available
//  */
//
// import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
//
// interface UserContextType {
//   userId: string;
//   setUserId: (userId: string) => void;
//   isAuthenticated: boolean;
// }
//
// const UserContext = createContext<UserContextType | undefined>(undefined);
//
// const DEFAULT_USER_ID = 'demo_user';
// const USER_ID_STORAGE_KEY = 'app_user_id';
//
// export function UserProvider({ children }: { children: ReactNode }) {
//   const [userId, setUserIdState] = useState<string>(() => {
//     // Load from localStorage or use default
//     if (typeof window !== 'undefined') {
//       const stored = localStorage.getItem(USER_ID_STORAGE_KEY);
//       return stored || DEFAULT_USER_ID;
//     }
//     return DEFAULT_USER_ID;
//   });
//
//   // Persist to localStorage when userId changes
//   useEffect(() => {
//     if (typeof window !== 'undefined') {
//       localStorage.setItem(USER_ID_STORAGE_KEY, userId);
//     }
//   }, [userId]);
//
//   const setUserId = (newUserId: string) => {
//     setUserIdState(newUserId);
//   };
//
//   const value = {
//     userId,
//     setUserId,
//     isAuthenticated: !!userId,
//   };
//
//   return <UserContext.Provider value={value}>{children}</UserContext.Provider>;
// }
//
// /**
//  * Hook to access user context
//  * @throws Error if used outside UserProvider
//  */
// export function useUser() {
//   const context = useContext(UserContext);
//   if (context === undefined) {
//     throw new Error('useUser must be used within a UserProvider');
//   }
//   return context;
// }
