'use server';

import { initializeApp, getApps, getApp, type FirebaseOptions } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { firebaseConfig } from './config';

const firebaseAdminConfig: FirebaseOptions = {
    credential: undefined, // Deixado como undefined para usar as credenciais do ambiente
    projectId: firebaseConfig.projectId,
};

function getFirebaseAdminApp() {
    if (getApps().length > 0) {
        return getApp();
    }
    return initializeApp(firebaseAdminConfig);
}

export const adminApp = getFirebaseAdminApp();
export const db = getFirestore(adminApp);
