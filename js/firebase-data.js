// ============================================================
//  Firebase Data Layer — CRUD para Firestore con fallback localStorage
//  Estructura: users/{uid}/facturas, users/{uid}/perfil, users/{uid}/alertas
// ============================================================

const DataService = {
    // ---- UID helper ----
    _getUid() {
        if (FIREBASE_CONFIGURED && auth && auth.currentUser) return auth.currentUser.uid;
        return localStorage.getItem('userId') || 'local';
    },

    _isFirebase() {
        return FIREBASE_CONFIGURED && db && auth && auth.currentUser;
    },

    // ===================== PERFIL =====================
    async getPerfil() {
        if (this._isFirebase()) {
            try {
                const doc = await db.collection('users').doc(this._getUid()).get();
                if (doc.exists && doc.data().perfil) return doc.data().perfil;
            } catch (e) { console.warn('Firestore getPerfil error:', e); }
        }
        return JSON.parse(localStorage.getItem('perfil')) || {
            nombre: '', correo: localStorage.getItem('userEmail') || '', zona: '', tipo: '',
            servicios: { agua: true, energia: true, gas: true, internet: true },
            umbrales: { agua: { consumo: 0, valor: 0 }, energia: { consumo: 0, valor: 0 }, gas: { consumo: 0, valor: 0 }, internet: { consumo: 0, valor: 0 } }
        };
    },

    async savePerfil(perfil) {
        localStorage.setItem('perfil', JSON.stringify(perfil));
        if (this._isFirebase()) {
            try {
                await db.collection('users').doc(this._getUid()).set({ perfil }, { merge: true });
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
                if (list.length > 0) { localStorage.setItem('facturas', JSON.stringify(list)); return list; }
            } catch (e) { console.warn('Firestore getFacturas error:', e); }
        }
        return JSON.parse(localStorage.getItem('facturas') || '[]');
    },

    async saveFactura(factura) {
        // localStorage
        const local = JSON.parse(localStorage.getItem('facturas') || '[]');
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
        const local = JSON.parse(localStorage.getItem('facturas') || '[]').filter(f => f.id !== id);
        localStorage.setItem('facturas', JSON.stringify(local));
        if (this._isFirebase()) {
            try {
                await db.collection('users').doc(this._getUid()).collection('facturas').doc(id).delete();
            } catch (e) { console.warn('Firestore deleteFactura error:', e); }
        }
    },

    async updateFactura(id, data) {
        const local = JSON.parse(localStorage.getItem('facturas') || '[]');
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
                if (list.length > 0) { localStorage.setItem('alertas', JSON.stringify(list)); return list; }
            } catch (e) { console.warn('Firestore getAlertas error:', e); }
        }
        return JSON.parse(localStorage.getItem('alertas') || '[]');
    },

    async saveAlerta(alerta) {
        const local = JSON.parse(localStorage.getItem('alertas') || '[]');
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
        const local = JSON.parse(localStorage.getItem('alertas') || '[]');
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
                localStorage.setItem('perfil', JSON.stringify(userDoc.data().perfil));
            }
            // Sync facturas
            const factSnap = await db.collection('users').doc(this._getUid()).collection('facturas').get();
            const facturas = [];
            factSnap.forEach(d => facturas.push({ id: d.id, ...d.data() }));
            if (facturas.length > 0) localStorage.setItem('facturas', JSON.stringify(facturas));
            // Sync alertas
            const alertSnap = await db.collection('users').doc(this._getUid()).collection('alertas').get();
            const alertas = [];
            alertSnap.forEach(d => alertas.push({ id: d.id, ...d.data() }));
            if (alertas.length > 0) localStorage.setItem('alertas', JSON.stringify(alertas));
            console.log('✅ Datos sincronizados desde Firestore');
        } catch (e) { console.warn('Sync error:', e); }
    }
};

window.DataService = DataService;
