import { 
  collection, 
  doc, 
  setDoc, 
  getDoc, 
  getDocs, 
  query, 
  where, 
  deleteDoc, 
  orderBy,
  Timestamp
} from 'firebase/firestore';
import { db, auth, handleFirestoreError, OperationType } from '../lib/firebase';

export interface SavedSignal {
  id: string; // Document ID
  authorUid: string;
  name: string;
  description?: string;
  category?: string;
  tags?: string[];
  parameters?: string; // JSON string
  data: string; // JSON stringified data
  createdAt: string;
}

const SIGNALS_COLLECTION = 'signals';

export async function saveSignal(signalData: Omit<SavedSignal, 'id' | 'authorUid' | 'createdAt'>): Promise<string> {
  const user = auth.currentUser;
  if (!user) {
    throw new Error('Must be logged in to save a signal');
  }

  const newSignalId = doc(collection(db, SIGNALS_COLLECTION)).id;
  const createdAt = new Date().toISOString();

  const savedSignal: SavedSignal = {
    ...signalData,
    id: newSignalId,
    authorUid: user.uid,
    createdAt
  };

  try {
    await setDoc(doc(db, SIGNALS_COLLECTION, newSignalId), savedSignal);
    return newSignalId;
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, SIGNALS_COLLECTION);
    throw error;
  }
}

export async function getSavedSignals(): Promise<SavedSignal[]> {
  const user = auth.currentUser;
  if (!user) {
    return [];
  }

  try {
    const q = query(
      collection(db, SIGNALS_COLLECTION),
      where('authorUid', '==', user.uid)
    );
    // Note: To use orderBy('createdAt', 'desc'), we'd need a composite index in Firestore.
    // For now, sorting on client side to avoid index creation requirements for the user.
    const querySnapshot = await getDocs(q);
    const signals: SavedSignal[] = [];
    querySnapshot.forEach((doc) => {
      signals.push(doc.data() as SavedSignal);
    });
    
    // Sort descending by date
    return signals.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, SIGNALS_COLLECTION);
    return [];
  }
}

export async function getSavedSignal(id: string): Promise<SavedSignal | null> {
  try {
    const docRef = doc(db, SIGNALS_COLLECTION, id);
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
      return docSnap.data() as SavedSignal;
    }
    return null;
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, `${SIGNALS_COLLECTION}/${id}`);
    return null;
  }
}

export async function deleteSavedSignal(id: string): Promise<void> {
  const user = auth.currentUser;
  if (!user) {
    throw new Error('Must be logged in to delete a signal');
  }

  try {
    await deleteDoc(doc(db, SIGNALS_COLLECTION, id));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, `${SIGNALS_COLLECTION}/${id}`);
    throw error;
  }
}
