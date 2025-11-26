import { 
  collection, 
  doc, 
  setDoc, 
  getDoc, 
  deleteDoc, 
  query, 
  where, 
  getDocs,
  Timestamp 
} from 'firebase/firestore';
import { db } from '@/lib/firebase-config'; // your existing firebase config

export interface Session {
  id: string;
  userId: string;
  createdAt: Timestamp;
  expiresAt: Timestamp;
  userAgent?: string;
}

// Create new session (call this after login)
export async function createSession(userId: string, sessionId: string) {
  try {
    // Delete all old sessions for this user first
    await deleteUserSessions(userId);
    
    const sessionRef = doc(db, 'sessions', sessionId);
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7); // 7 days expiry
    
    await setDoc(sessionRef, {
      id: sessionId,
      userId,
      createdAt: Timestamp.now(),
      expiresAt: Timestamp.fromDate(expiresAt),
      userAgent: typeof window !== 'undefined' ? navigator.userAgent : ''
    });
    
    return true;
  } catch (error) {
    console.error('Error creating session:', error);
    return false;
  }
}

// Validate if session exists and is not expired
export async function validateSession(sessionId: string): Promise<boolean> {
  try {
    const sessionRef = doc(db, 'sessions', sessionId);
    const sessionSnap = await getDoc(sessionRef);
    
    if (!sessionSnap.exists()) {
      return false;
    }
    
    const session = sessionSnap.data() as Session;
    const now = Timestamp.now();
    
    // Check if expired
    if (session.expiresAt.toMillis() < now.toMillis()) {
      await deleteDoc(sessionRef);
      return false;
    }
    
    return true;
  } catch (error) {
    console.error('Error validating session:', error);
    return false;
  }
}

// Delete all sessions for a user
export async function deleteUserSessions(userId: string) {
  try {
    const sessionsRef = collection(db, 'sessions');
    const q = query(sessionsRef, where('userId', '==', userId));
    const querySnapshot = await getDocs(q);
    
    const deletePromises = querySnapshot.docs.map(doc => deleteDoc(doc.ref));
    await Promise.all(deletePromises);
    
    return true;
  } catch (error) {
    console.error('Error deleting user sessions:', error);
    return false;
  }
}

// Delete specific session
export async function deleteSession(sessionId: string) {
  try {
    const sessionRef = doc(db, 'sessions', sessionId);
    await deleteDoc(sessionRef);
    return true;
  } catch (error) {
    console.error('Error deleting session:', error);
    return false;
  }
}

// Get session data
export async function getSession(sessionId: string): Promise<Session | null> {
  try {
    const sessionRef = doc(db, 'sessions', sessionId);
    const sessionSnap = await getDoc(sessionRef);
    
    if (!sessionSnap.exists()) {
      return null;
    }
    
    return sessionSnap.data() as Session;
  } catch (error) {
    console.error('Error getting session:', error);
    return null;
  }
}