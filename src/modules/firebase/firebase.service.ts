import * as admin from 'firebase-admin';
import { Injectable } from '@nestjs/common';

@Injectable()
export class FirebaseService {
  private auth: admin.auth.Auth;

  constructor() {
    const serviceAccount = require('/home/rehan-azaz/Downloads/cold-plunge-c7a58-firebase-adminsdk-fbsvc-f53c9c5a06.json');

    if (!admin.apps.length) {
      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
      });
    }

    this.auth = admin.auth();
  }

  getAuth(): admin.auth.Auth {
    return this.auth;
  }
}
