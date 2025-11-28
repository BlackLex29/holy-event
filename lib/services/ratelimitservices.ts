// lib/rateLimit.ts
import { doc, getDoc, setDoc, serverTimestamp, runTransaction, updateDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase-config';

export interface RateLimitStatus {
  attempts: number;
  attemptsRemaining: number;
  isBlocked: boolean;
  blockUntil: number | null;
  blockCount: number;
  lastAttempt: number | null;
}

const BLOCK_DURATION = 15 * 60 * 1000; // 15 minutes
const MAX_ATTEMPTS = 5;
const PERMANENT_BLOCK_AFTER = 10; // Permanent block after 10 lockouts

// ✅ ENHANCED: Server-side validation with permanent block support
export const checkRateLimit = async (email: string): Promise<RateLimitStatus> => {
  try {
    const normalizedEmail = email.toLowerCase().trim();
    const rateLimitRef = doc(db, 'rateLimits', normalizedEmail);
    const now = Date.now();

    const docSnap = await getDoc(rateLimitRef);
    
    if (!docSnap.exists()) {
      return {
        attempts: 0,
        attemptsRemaining: MAX_ATTEMPTS,
        isBlocked: false,
        blockUntil: null,
        blockCount: 0,
        lastAttempt: null
      };
    }

    const data = docSnap.data();
    const blockUntil = data.blockUntil || null;
    const blockCount = data.blockCount || 0;
    const permanentBlock = data.permanentBlock || false;
    
    // CRITICAL: Check if permanently blocked
    if (permanentBlock) {
      return {
        attempts: data.attempts || 0,
        attemptsRemaining: 0,
        isBlocked: true,
        blockUntil: null, // Null means permanent block
        blockCount,
        lastAttempt: data.lastAttempt || null
      };
    }
    
    // Check if temporarily blocked
    if (blockUntil && now < blockUntil) {
      return {
        attempts: data.attempts || 0,
        attemptsRemaining: 0,
        isBlocked: true,
        blockUntil,
        blockCount,
        lastAttempt: data.lastAttempt || null
      };
    }

    // Reset if block expired
    if (blockUntil && now >= blockUntil) {
      await setDoc(rateLimitRef, {
        attempts: 0,
        lastAttempt: serverTimestamp(),
        isBlocked: false,
        blockUntil: null,
        blockCount: blockCount, // Keep block count for tracking
        permanentBlock: false,
        email: normalizedEmail,
        updatedAt: serverTimestamp()
      }, { merge: true });
      
      return {
        attempts: 0,
        attemptsRemaining: MAX_ATTEMPTS,
        isBlocked: false,
        blockUntil: null,
        blockCount,
        lastAttempt: null
      };
    }

    return {
      attempts: data.attempts || 0,
      attemptsRemaining: Math.max(0, MAX_ATTEMPTS - (data.attempts || 0)),
      isBlocked: false,
      blockUntil: null,
      blockCount,
      lastAttempt: data.lastAttempt || null
    };
  } catch (error) {
    console.error('Error checking rate limit:', error);
    throw new Error('Unable to verify account status. Please try again.');
  }
};

// ✅ ENHANCED: Track failed attempts with permanent block
export const trackFailedLogin = async (email: string): Promise<RateLimitStatus> => {
  try {
    const normalizedEmail = email.toLowerCase().trim();
    const rateLimitRef = doc(db, 'rateLimits', normalizedEmail);
    const now = Date.now();

    return await runTransaction(db, async (transaction) => {
      const docSnap = await transaction.get(rateLimitRef);
      
      if (!docSnap.exists()) {
        // First failed attempt
        transaction.set(rateLimitRef, {
          attempts: 1,
          lastAttempt: serverTimestamp(),
          isBlocked: false,
          blockUntil: null,
          blockCount: 0,
          permanentBlock: false,
          email: normalizedEmail,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp()
        });

        return {
          attempts: 1,
          attemptsRemaining: MAX_ATTEMPTS - 1,
          isBlocked: false,
          blockUntil: null,
          blockCount: 0,
          lastAttempt: now
        };
      }

      const data = docSnap.data();
      const blockCount = data.blockCount || 0;
      const blockUntil = data.blockUntil || null;
      const permanentBlock = data.permanentBlock || false;
      
      // Check permanent block first
      if (permanentBlock) {
        return {
          attempts: data.attempts || 0,
          attemptsRemaining: 0,
          isBlocked: true,
          blockUntil: null, // Null means permanent
          blockCount,
          lastAttempt: data.lastAttempt || null
        };
      }
      
      // Still temporarily blocked - reject attempt
      if (blockUntil && now < blockUntil) {
        return {
          attempts: data.attempts || 0,
          attemptsRemaining: 0,
          isBlocked: true,
          blockUntil,
          blockCount,
          lastAttempt: data.lastAttempt || null
        };
      }
      
      // Block expired - reset attempts but keep block count
      if (blockUntil && now >= blockUntil) {
        transaction.set(rateLimitRef, {
          attempts: 1,
          lastAttempt: serverTimestamp(),
          isBlocked: false,
          blockUntil: null,
          blockCount: blockCount, // Keep historical count
          permanentBlock: false,
          email: normalizedEmail,
          updatedAt: serverTimestamp()
        });
        
        return {
          attempts: 1,
          attemptsRemaining: MAX_ATTEMPTS - 1,
          isBlocked: false,
          blockUntil: null,
          blockCount,
          lastAttempt: now
        };
      }
      
      // Increment attempts
      const newAttempts = (data.attempts || 0) + 1;
      const isNowBlocked = newAttempts >= MAX_ATTEMPTS;
      
      // Check if we should apply permanent block
      const newBlockCount = isNowBlocked ? blockCount + 1 : blockCount;
      const shouldPermanentBlock = newBlockCount >= PERMANENT_BLOCK_AFTER;
      const newBlockUntil = isNowBlocked && !shouldPermanentBlock ? now + BLOCK_DURATION : null;
      
      const updateData: any = {
        attempts: newAttempts,
        lastAttempt: serverTimestamp(),
        isBlocked: isNowBlocked,
        blockUntil: newBlockUntil,
        blockCount: newBlockCount,
        updatedAt: serverTimestamp()
      };
      
      if (shouldPermanentBlock) {
        updateData.permanentBlock = true;
        updateData.blockUntil = null; // Clear temporary block for permanent
        updateData.permanentBlockAt = serverTimestamp();
      }

      transaction.update(rateLimitRef, updateData);

      return {
        attempts: newAttempts,
        attemptsRemaining: Math.max(0, MAX_ATTEMPTS - newAttempts),
        isBlocked: shouldPermanentBlock ? true : isNowBlocked,
        blockUntil: shouldPermanentBlock ? null : newBlockUntil,
        blockCount: newBlockCount,
        lastAttempt: now
      };
    });
  } catch (error) {
    console.error('Error tracking failed login:', error);
    throw new Error('Unable to process login attempt. Please try again.');
  }
};

// ✅ ENHANCED: Reset failed attempts (only if not permanently blocked)
export const resetFailedAttempts = async (email: string): Promise<void> => {
  try {
    const normalizedEmail = email.toLowerCase().trim();
    const rateLimitRef = doc(db, 'rateLimits', normalizedEmail);
    
    // Check if account is permanently blocked first
    const docSnap = await getDoc(rateLimitRef);
    if (docSnap.exists()) {
      const data = docSnap.data();
      if (data.permanentBlock) {
        console.warn('Cannot reset attempts: Account is permanently blocked');
        return;
      }
    }
    
    await setDoc(rateLimitRef, {
      attempts: 0,
      lastAttempt: serverTimestamp(),
      isBlocked: false,
      blockUntil: null,
      // Keep blockCount for tracking purposes
      email: normalizedEmail,
      lastSuccessfulLogin: serverTimestamp(),
      updatedAt: serverTimestamp()
    }, { merge: true });
  } catch (error) {
    console.error('Error resetting failed attempts:', error);
    // Don't throw - this shouldn't block successful login
  }
};

// ✅ ENHANCED: Get status with permanent block support
export const getRateLimitStatus = async (email: string): Promise<{
  isBlocked: boolean;
  isPermanent: boolean;
  remainingTime: number;
  attempts: number;
  attemptsRemaining: number;
  blockCount: number;
}> => {
  const status = await checkRateLimit(email);
  const now = Date.now();
  
  const isPermanent = status.blockUntil === null && status.isBlocked;
  const remainingTime = !isPermanent && status.blockUntil && status.blockUntil > now 
    ? Math.ceil((status.blockUntil - now) / 60000) 
    : 0;

  return {
    isBlocked: status.isBlocked,
    isPermanent,
    remainingTime,
    attempts: status.attempts,
    attemptsRemaining: status.attemptsRemaining,
    blockCount: status.blockCount
  };
};

// ✅ NEW: Manual unlock function (admin use)
export const manuallyUnlockAccount = async (email: string): Promise<void> => {
  try {
    const normalizedEmail = email.toLowerCase().trim();
    const rateLimitRef = doc(db, 'rateLimits', normalizedEmail);
    
    await setDoc(rateLimitRef, {
      attempts: 0,
      isBlocked: false,
      blockUntil: null,
      permanentBlock: false,
      manuallyUnlocked: true,
      unlockedAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    }, { merge: true });
  } catch (error) {
    console.error('Error manually unlocking account:', error);
    throw new Error('Failed to unlock account');
  }
};

// ✅ NEW: Get account lock status
export const getAccountLockStatus = async (email: string): Promise<{
  isLocked: boolean;
  isPermanent: boolean;
  lockReason: string;
  unlockTime: number | null;
  blockCount: number;
}> => {
  const status = await getRateLimitStatus(email);
  
  let lockReason = 'not_locked';
  if (status.isPermanent) {
    lockReason = 'permanent_block';
  } else if (status.isBlocked) {
    lockReason = 'temporary_block';
  }
  
  return {
    isLocked: status.isBlocked,
    isPermanent: status.isPermanent,
    lockReason,
    unlockTime: status.remainingTime > 0 ? Date.now() + (status.remainingTime * 60000) : null,
    blockCount: status.blockCount
  };
};