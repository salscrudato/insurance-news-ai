import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
import type { NewsSignal } from '@insurance-news-ai/shared';

// Initialize Firebase Admin
admin.initializeApp();

/**
 * HTTP Cloud Function to fetch news signals
 * Gen 2 ready
 */
export const getNewsSignals = functions.https.onRequest(
  async (request, response) => {
    try {
      // TODO: Implement news signal fetching logic
      const signals: NewsSignal[] = [];

      response.json({
        success: true,
        data: signals,
      });
    } catch (error) {
      console.error('Error fetching news signals:', error);
      response.status(500).json({
        success: false,
        error: 'Failed to fetch news signals',
      });
    }
  }
);

/**
 * Firestore trigger to process new signals
 */
export const onSignalCreated = functions.firestore
  .document('signals/{signalId}')
  .onCreate(async (snap) => {
    const signal = snap.data() as NewsSignal;
    console.log('New signal created:', signal.id);
    // TODO: Implement signal processing logic
  });

/**
 * Scheduled function to fetch and update signals daily
 */
export const dailySignalUpdate = functions.pubsub
  .schedule('every day 08:00')
  .timeZone('America/New_York')
  .onRun(async () => {
    console.log('Running daily signal update');
    // TODO: Implement daily update logic
  });

