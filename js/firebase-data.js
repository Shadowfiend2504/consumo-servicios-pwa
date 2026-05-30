// ============================================================
//  Firebase Data Layer — CRUD para Firestore con fallback localStorage
//  Estructura: users/{uid}/facturas, users/{uid}/perfil, users/{uid}/alertas
// ============================================================

// Ensure legacy scripts that reference the global flag won't throw — use window property only
if (typeof window.FIREBASE_CONFIGURED === 'undefined') {
    try {
        window.FIREBASE_CONFIGURED = Boolean(window.__FIREBASE_CONFIG__ || window.FIREBASE_CONFIGURED);
    } catch (e) {
        window.FIREBASE_CONFIGURED = false;
    }
}

const DataService = {
    _safeParse(value, fallback) {
        try {
            const parsed = JSON.parse(value);
            return parsed == null ? fallback : parsed;
        } catch (e) {
            return fallback;
        }
    },

    _defaultPerfil() {
        return {
            nombre: '',
            correo: localStorage.getItem('userEmail') || '',
            zona: '',
            tipo: '',
            servicios: { agua: true, energia: true, gas: true, internet: true },
            umbrales: {
                agua: { consumo: 0, valor: 0 },
                energia: { consumo: 0, valor: 0 },
                gas: { consumo: 0, valor: 0 },
                internet: { consumo: 0, valor: 0 }
            }
        };
    },

    _normalizePerfil(perfil) {
        const base = this._defaultPerfil();
        const src = (perfil && typeof perfil === 'object') ? perfil : {};
        const serviciosIn = (src.servicios && typeof src.servicios === 'object') ? src.servicios : {};
        const umbralesIn = (src.umbrales && typeof src.umbrales === 'object') ? src.umbrales : {};

        const servicios = { ...base.servicios, ...serviciosIn };
        const umbrales = {};
        Object.keys(base.umbrales).forEach((svc) => {
            const u = (umbralesIn[svc] && typeof umbralesIn[svc] === 'object') ? umbralesIn[svc] : {};
            umbrales[svc] = {
                consumo: Number(u.consumo) || 0,
                valor: Number(u.valor) || 0
            };
        });

        return {
            ...base,
            ...src,
            servicios,
            umbrales,
            correo: src.correo || base.correo
        };
    },

    // ---- Firebase helpers (safe globals) ----
    _fbConfigured() {
        return !!(window.__FIREBASE_CONFIG__ || window.FIREBASE_CONFIGURED);
    },

    _fbAuth() {
        return window.auth || window.firebaseAuth || null;
    },

    _fbDb() {
        return window.db || window.firebaseDb || null;
    },
    // ---- UID helper ----
    _getUid() {
        const fbAuth = this._fbAuth();
        if (this._fbConfigured() && fbAuth && fbAuth.currentUser) return fbAuth.currentUser.uid;
        return localStorage.getItem('userId') || 'local';
    },

    _isFirebase() {
        const fbAuth = this._fbAuth();
        const fbDb = this._fbDb();
        return this._fbConfigured() && fbDb && fbAuth && fbAuth.currentUser;
    },

    // ===================== PERFIL =====================
    async getPerfil() {
        if (this._isFirebase()) {
            try {
                const doc = await db.collection('users').doc(this._getUid()).get();
                if (doc.exists && doc.data().perfil) return this._normalizePerfil(doc.data().perfil);
            } catch (e) { console.warn('Firestore getPerfil error:', e); }
        }
        return this._normalizePerfil(this._safeParse(localStorage.getItem('perfil'), null));
    },

    async savePerfil(perfil) {
        const normalized = this._normalizePerfil(perfil);
        localStorage.setItem('perfil', JSON.stringify(normalized));
        if (this._isFirebase()) {
            try {
                await db.collection('users').doc(this._getUid()).set({ perfil: normalized }, { merge: true });
            } catch (e) { console.warn('Firestore savePerfil error:', e); }
        }
    },

    // ===================== FACTURAS =====================
    async getFacturas() {
        if (this._isFirebase()) {
            try {
                const snap = await db.collection('users').doc(this._getUid()).collection('facturas').orderBy('periodo', 'desc').get();
                const list = [];
                snap.forEach(d => list.push({ id: d.id, ...d.data() }));
                localStorage.setItem('facturas', JSON.stringify(list));
                return list;
            } catch (e) { console.warn('Firestore getFacturas error:', e); }
        }
        return this._safeParse(localStorage.getItem('facturas'), []);
    },

    async saveFactura(factura) {
        // localStorage
        const local = this._safeParse(localStorage.getItem('facturas'), []);
        local.unshift(factura);
        localStorage.setItem('facturas', JSON.stringify(local));
        // Firestore
        if (this._isFirebase()) {
            try {
                await db.collection('users').doc(this._getUid()).collection('facturas').doc(factura.id).set(factura);
            } catch (e) { console.warn('Firestore saveFactura error:', e); }
        }
    },

    async deleteFactura(id) {
        const local = this._safeParse(localStorage.getItem('facturas'), []).filter(f => f.id !== id);
        localStorage.setItem('facturas', JSON.stringify(local));
        if (this._isFirebase()) {
            try {
                await db.collection('users').doc(this._getUid()).collection('facturas').doc(id).delete();
            } catch (e) { console.warn('Firestore deleteFactura error:', e); }
        }
    },

    async updateFactura(id, data) {
        const local = this._safeParse(localStorage.getItem('facturas'), []);
        const idx = local.findIndex(f => f.id === id);
        if (idx !== -1) { Object.assign(local[idx], data); localStorage.setItem('facturas', JSON.stringify(local)); }
        if (this._isFirebase()) {
            try {
                await db.collection('users').doc(this._getUid()).collection('facturas').doc(id).update(data);
            } catch (e) { console.warn('Firestore updateFactura error:', e); }
        }
    },

    // ===================== ALERTAS =====================
    async getAlertas() {
        if (this._isFirebase()) {
            try {
                const snap = await db.collection('users').doc(this._getUid()).collection('alertas').orderBy('fecha', 'desc').get();
                const list = [];
                snap.forEach(d => list.push({ id: d.id, ...d.data() }));
                localStorage.setItem('alertas', JSON.stringify(list));
                return list;
            } catch (e) { console.warn('Firestore getAlertas error:', e); }
        }
        return this._safeParse(localStorage.getItem('alertas'), []);
    },

    async saveAlerta(alerta) {
        const local = this._safeParse(localStorage.getItem('alertas'), []);
        local.push(alerta);
        localStorage.setItem('alertas', JSON.stringify(local));
        if (this._isFirebase()) {
            try {
                const docId = alerta._key || ('ALR-' + Date.now());
                await db.collection('users').doc(this._getUid()).collection('alertas').doc(docId).set(alerta);
            } catch (e) { console.warn('Firestore saveAlerta error:', e); }
        }
    },

    async updateAlerta(index, data) {
        const local = this._safeParse(localStorage.getItem('alertas'), []);
        if (local[index]) {
            Object.assign(local[index], data);
            localStorage.setItem('alertas', JSON.stringify(local));
            if (this._isFirebase() && local[index]._key) {
                try {
                    await db.collection('users').doc(this._getUid()).collection('alertas').doc(local[index]._key).update(data);
                } catch (e) { console.warn('Firestore updateAlerta error:', e); }
            }
        }
    },

    async clearAlertas() {
        localStorage.removeItem('alertas');
        if (this._isFirebase()) {
            try {
                const snap = await db.collection('users').doc(this._getUid()).collection('alertas').get();
                const batch = db.batch();
                snap.forEach(d => batch.delete(d.ref));
                await batch.commit();
            } catch (e) { console.warn('Firestore clearAlertas error:', e); }
        }
    },

    // ===================== SYNC =====================
    async syncFromFirestore() {
        if (!this._isFirebase()) return;
        try {
            // Sync perfil
            const userDoc = await db.collection('users').doc(this._getUid()).get();
            if (userDoc.exists && userDoc.data().perfil) {
                localStorage.setItem('perfil', JSON.stringify(this._normalizePerfil(userDoc.data().perfil)));
            } else {
                localStorage.setItem('perfil', JSON.stringify(this._defaultPerfil()));
            }
            // Sync facturas
            const factSnap = await db.collection('users').doc(this._getUid()).collection('facturas').get();
            const facturas = [];
            factSnap.forEach(d => facturas.push({ id: d.id, ...d.data() }));
            localStorage.setItem('facturas', JSON.stringify(facturas));
            // Sync alertas
            const alertSnap = await db.collection('users').doc(this._getUid()).collection('alertas').get();
            const alertas = [];
            alertSnap.forEach(d => alertas.push({ id: d.id, ...d.data() }));
            localStorage.setItem('alertas', JSON.stringify(alertas));
            console.log('✅ Datos sincronizados desde Firestore');
        } catch (e) { console.warn('Sync error:', e); }
    }
};

window.DataService = DataService;
