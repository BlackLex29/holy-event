import { getAuth } from 'firebase-admin/auth';
import * as admin from 'firebase-admin';
import hotdog from '../holy-event/holy-event-78a97-firebase-adminsdk-fbsvc-21b7522113.json'
// Initialize Firebase Admin SDK
// Option 1: Using service account key file
admin.initializeApp({
    credential: admin.credential.cert('../holy-event/holy-event-78a97-firebase-adminsdk-fbsvc-21b7522113.json')
});

// Option 2: Using default credentials (if running on GCP or with GOOGLE_APPLICATION_CREDENTIALS env var)
// admin.initializeApp();

async function enableTotpMfa() {
    try {
        const auth = getAuth();

        await auth.projectConfigManager().updateProjectConfig({
            multiFactorConfig: {
                state: "ENABLED",
                providerConfigs: [{
                    state: "ENABLED",
                    totpProviderConfig: {
                        adjacentIntervals: 5  // Default is 5, range: 0-10
                    }
                }]
            }
        });

        console.log('✅ TOTP MFA has been successfully enabled!');
    } catch (error) {
        console.error('❌ Error enabling TOTP MFA:', error);
        throw error;
    }
}

// Run the function
enableTotpMfa()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });