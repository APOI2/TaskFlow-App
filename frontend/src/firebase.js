import { initializeApp } from "firebase/app";
import {
  getFirestore,
  collection,
  doc,
  setDoc,
  getDoc,
  getDocs,
  query,
  where,
  onSnapshot,
  updateDoc,
  deleteDoc,
  serverTimestamp,
  addDoc
} from "firebase/firestore";
import { 
  getAuth, 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword, 
  updateProfile,
  signOut
} from "firebase/auth";

// TODO: Reemplaza esta configuración con la de tu proyecto de Firebase
// Puedes encontrarla en la consola de Firebase -> Project Settings -> General -> Your apps
const firebaseConfig = {
  apiKey: "AIzaSyDOWb_8kdq1kX_xAAgpJP5bfV_MuvK9qT8",
  authDomain: "taskflow-app-2cb58.firebaseapp.com",
  projectId: "taskflow-app-2cb58",
  storageBucket: "taskflow-app-2cb58.firebasestorage.app",
  messagingSenderId: "661354487895",
  appId: "1:661354487895:web:28274f1ceb04059c950312",
  measurementId: "G-QFP30K4889"
};


// Verifica si la configuración es válida (para evitar crasheos si no se ha configurado)
const isConfigured = firebaseConfig.apiKey !== "TU_API_KEY";

let app, db, auth;

if (isConfigured) {
  app = initializeApp(firebaseConfig);
  db = getFirestore(app);
  auth = getAuth(app);
}

// Simulador de Base de datos en LocalStorage (Solo activo si Firebase no está configurado)
// Esto permite que pruebes la app inmediatamente sin configurar Firebase todavía.
class LocalStore {
  constructor() {
    this.storage = window.localStorage;
    if (!this.storage.getItem('projects')) this.storage.setItem('projects', JSON.stringify({}));
    if (!this.storage.getItem('activities')) this.storage.setItem('activities', JSON.stringify({}));
    if (!this.storage.getItem('users')) this.storage.setItem('users', JSON.stringify({}));
    if (!this.storage.getItem('projectRoutines')) this.storage.setItem('projectRoutines', JSON.stringify({}));
  }

  // Helpers para simular las llamadas asíncronas de Firebase
  async get(col, id) {
    const data = JSON.parse(this.storage.getItem(col));
    return data[id] ? { id, data: () => data[id], exists: () => true } : { exists: () => false };
  }

  async query(col, field, value) {
    const data = JSON.parse(this.storage.getItem(col));
    return { docs: Object.entries(data).filter(([_, v]) => v[field] === value).map(([k, v]) => ({ id: k, data: () => v })) };
  }

  async set(col, id, obj) {
    const data = JSON.parse(this.storage.getItem(col));
    data[id] = { ...obj, id }; // Asegurar que el id esté
    this.storage.setItem(col, JSON.stringify(data));
  }

  async update(col, id, obj) {
    const data = JSON.parse(this.storage.getItem(col));
    if (data[id]) {
      data[id] = { ...data[id], ...obj };
      this.storage.setItem(col, JSON.stringify(data));
    }
  }

  async delete(col, id) {
    const data = JSON.parse(this.storage.getItem(col));
    delete data[id];
    this.storage.setItem(col, JSON.stringify(data));
  }

  // Simulador de onSnapshot (solo lee la vez inicial para el prototipo, requeriría recarga para ver cambios si se usa local)
  onSnapshotMock(col, field, value, callback) {
    this.query(col, field, value).then(res => {
      callback({ docs: res.docs });
    });
    // Agregamos un listener de storage para cross-tab sync si estamos en otra pestaña
    const listener = (e) => {
      if (e.key === col) {
        this.query(col, field, value).then(res => callback({ docs: res.docs }));
      }
    };
    window.addEventListener('storage', listener);
    return () => window.removeEventListener('storage', listener);
  }
}

const localDb = new LocalStore();

// Generador de códigos aleatorios
const generateCode = () => Math.random().toString(36).substring(2, 8).toUpperCase();
const generateId = () => Math.random().toString(36).substring(2, 15);

export { auth };

export const authService = {
  register: async (email, password, name) => {
    if (isConfigured) {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      // Actualizar el perfil con el nombre
      await updateProfile(userCredential.user, { displayName: name });
      
      // Guardar información adicional en firestore, PERO SIN CONTRASEÑA
      const docRef = doc(db, "users", userCredential.user.uid);
      const userData = { email, name, createdAt: Date.now() };
      await setDoc(docRef, userData);
      
      return { id: userCredential.user.uid, name, email };
    } else {
      const q = await localDb.query('users', 'email', email);
      if (q.docs.length > 0) throw new Error("El correo ya está registrado");
      
      const id = generateId();
      const userData = { email, password, name, createdAt: Date.now() };
      await localDb.set('users', id, userData);
      return { id, name, email };
    }
  },
  login: async (email, password) => {
    if (isConfigured) {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      return { 
        id: userCredential.user.uid, 
        name: userCredential.user.displayName, 
        email: userCredential.user.email 
      };
    } else {
      const q = await localDb.query('users', 'email', email);
      const user = q.docs.find(d => d.data().password === password);
      if (!user) throw new Error("Credenciales inválidas");
      return { id: user.id, name: user.data().name, email: user.data().email };
    }
  },
  logout: async () => {
    if (isConfigured) {
      await signOut(auth);
    }
  }
};

export const dbService = {
  createProject: async (name, leaderId) => {
    const joinCode = generateCode();
    const projectData = {
      name,
      joinCode,
      leaderId,
      helpers: [],
      createdAt: Date.now()
    };

    if (isConfigured) {
      const docRef = doc(collection(db, "projects"));
      await setDoc(docRef, projectData);
      return { id: docRef.id, ...projectData };
    } else {
      const id = generateId();
      await localDb.set('projects', id, projectData);
      return { id, ...projectData };
    }
  },

  joinProject: async (joinCode, helperId, nickname) => {
    if (isConfigured) {
      const q = query(collection(db, "projects"), where("joinCode", "==", joinCode));
      const querySnapshot = await getDocs(q);
      if (querySnapshot.empty) throw new Error("Código de proyecto inválido");

      const projectDoc = querySnapshot.docs[0];
      const projectData = projectDoc.data();

      // Añadir ayudante si no existe
      if (!projectData.helpers.find(h => h.id === helperId)) {
        const helpers = [...projectData.helpers, { id: helperId, name: nickname }];
        await updateDoc(doc(db, "projects", projectDoc.id), { helpers });
      }
      return { id: projectDoc.id, ...projectData };
    } else {
      const q = await localDb.query('projects', 'joinCode', joinCode);
      if (q.docs.length === 0) throw new Error("Código de proyecto inválido");

      const projectDoc = q.docs[0];
      const projectData = projectDoc.data();
      if (!projectData.helpers.find(h => h.id === helperId)) {
        const helpers = [...projectData.helpers, { id: helperId, name: nickname }];
        await localDb.update('projects', projectDoc.id, { helpers });
      }
      return { id: projectDoc.id, ...projectData };
    }
  },

  getProjectsForLeader: async (leaderId) => {
    if (isConfigured) {
      const q = query(collection(db, "projects"), where("leaderId", "==", leaderId));
      const snap = await getDocs(q);
      return snap.docs.map(d => ({ id: d.id, ...d.data() }));
    } else {
      const q = await localDb.query('projects', 'leaderId', leaderId);
      return q.docs.map(d => ({ id: d.id, ...d.data() }));
    }
  },

  getProjectsForHelper: async (helperId) => {
    // Para simplificar, obtenemos todos los locales y filtramos
    if (isConfigured) {
      // Firebase array-contains
      const snap = await getDocs(collection(db, "projects"));
      return snap.docs.map(d => ({ id: d.id, ...d.data() })).filter(p => p.helpers?.some(h => h.id === helperId));
    } else {
      const data = JSON.parse(localDb.storage.getItem('projects'));
      return Object.values(data).filter(p => p.helpers?.some(h => h.id === helperId));
    }
  },

  createActivity: async (projectId, title, description, assignedTo = null, type = 'normal', targetAmount = null, deadline = null) => {
    const actData = {
      projectId,
      title,
      description,
      assignedTo,
      type,
      targetAmount,
      currentAmount: type === 'numerical' ? 0 : null,
      deadline,
      status: 'pending',
      createdAt: Date.now(),
      completedAt: null,
      timeTakenMs: null
    };

    if (isConfigured) {
      const docRef = doc(collection(db, "activities"));
      await setDoc(docRef, actData);
    } else {
      await localDb.set('activities', generateId(), actData);
    }
  },

  subscribeToActivities: (projectId, callback) => {
    if (isConfigured) {
      const q = query(collection(db, "activities"), where("projectId", "==", projectId));
      return onSnapshot(q, (snapshot) => {
        callback(snapshot.docs.map(d => ({ id: d.id, ...d.data() })));
      });
    } else {
      return localDb.onSnapshotMock('activities', 'projectId', projectId, (snap) => {
        callback(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      });
    }
  },

  updateActivity: async (activityId, updates) => {
    if (isConfigured) {
      await updateDoc(doc(db, "activities", activityId), updates);
    } else {
      await localDb.update('activities', activityId, updates);
    }
  },

  completeActivity: async (activity) => {
    const completedAt = Date.now();
    const timeTakenMs = completedAt - activity.createdAt;

    if (isConfigured) {
      await updateDoc(doc(db, "activities", activity.id), {
        status: 'completed',
        completedAt,
        timeTakenMs
      });
    } else {
      await localDb.update('activities', activity.id, {
        status: 'completed',
        completedAt,
        timeTakenMs
      });
    }
  },

  submitActivity: async (activity, finalAmount = null) => {
    const updates = { status: 'submitted' };
    if (finalAmount !== null) updates.currentAmount = finalAmount;
    if (isConfigured) {
      await updateDoc(doc(db, "activities", activity.id), updates);
    } else {
      await localDb.update('activities', activity.id, updates);
    }
  },

  returnActivity: async (activityId, newAmount = null) => {
    const updates = { status: 'pending' };
    if (newAmount !== null) updates.currentAmount = newAmount;
    if (isConfigured) {
      await updateDoc(doc(db, "activities", activityId), updates);
    } else {
      await localDb.update('activities', activityId, updates);
    }
  },

  getActivitiesForProject: async (projectId) => {
    if (isConfigured) {
      const q = query(collection(db, "activities"), where("projectId", "==", projectId));
      const snap = await getDocs(q);
      return snap.docs.map(d => ({ id: d.id, ...d.data() }));
    } else {
      const q = await localDb.query('activities', 'projectId', projectId);
      return q.docs.map(d => ({ id: d.id, ...d.data() }));
    }
  },

  createProjectRoutine: async (leaderId, projectName, activities) => {
    const routineData = { leaderId, name: projectName, activities, createdAt: Date.now() };
    if (isConfigured) {
      const docRef = doc(collection(db, "projectRoutines"));
      await setDoc(docRef, routineData);
    } else {
      await localDb.set('projectRoutines', generateId(), routineData);
    }
  },

  subscribeToProjectRoutines: (leaderId, callback) => {
    if (isConfigured) {
      const q = query(collection(db, "projectRoutines"), where("leaderId", "==", leaderId));
      return onSnapshot(q, (snapshot) => {
        callback(snapshot.docs.map(d => ({ id: d.id, ...d.data() })));
      });
    } else {
      return localDb.onSnapshotMock('projectRoutines', 'leaderId', leaderId, (snap) => {
        callback(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      });
    }
  },

  deleteProjectRoutine: async (routineId) => {
    if (isConfigured) await deleteDoc(doc(db, "projectRoutines", routineId));
    else await localDb.delete('projectRoutines', routineId);
  },

  deployProjectRoutine: async (leaderId, routineId) => {
    let routineData;
    if (isConfigured) {
      const docSnap = await getDoc(doc(db, "projectRoutines", routineId));
      if (!docSnap.exists()) throw new Error("Rutina no encontrada");
      routineData = docSnap.data();
    } else {
      const docData = await localDb.get('projectRoutines', routineId);
      if (!docData.exists()) throw new Error("Rutina no encontrada");
      routineData = docData.data();
    }
    
    const proj = await dbService.createProject(routineData.name, leaderId);
    
    if (routineData.activities && routineData.activities.length > 0) {
      for (const act of routineData.activities) {
        await dbService.createActivity(
          proj.id,
          act.title,
          act.description,
          null,
          act.type || 'normal',
          act.targetAmount || null,
          null
        );
      }
    }
    return proj;
  },

  deleteActivity: async (activityId) => {
    if (isConfigured) {
      await deleteDoc(doc(db, "activities", activityId));
    } else {
      await localDb.delete('activities', activityId);
    }
  },

  deleteProject: async (projectId) => {
    if (isConfigured) {
      // Borrar todas las actividades primero
      const q = query(collection(db, "activities"), where("projectId", "==", projectId));
      const snap = await getDocs(q);
      const deletePromises = snap.docs.map(d => deleteDoc(d.ref));
      await Promise.all(deletePromises);
      // Luego borrar el proyecto
      await deleteDoc(doc(db, "projects", projectId));
    } else {
      const acts = await localDb.query('activities', 'projectId', projectId);
      acts.docs.forEach(d => localDb.delete('activities', d.id));
      await localDb.delete('projects', projectId);
    }
  }
};
