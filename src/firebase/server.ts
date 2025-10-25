'use server';

// Usaremos o SDK do cliente para consistência, pois a importação é executada no servidor
// mas dentro do contexto de uma Server Action do Next.js.
import { initializeApp, getApps, getApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { firebaseConfig } from './config';


function getClientApp() {
    if (getApps().length > 0) {
        return getApp();
    }
    return initializeApp(firebaseConfig);
}

export const app = getClientApp();
export const db = getFirestore(app);
