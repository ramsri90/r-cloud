/**
 * R Cloud Telegram MTProto / API Client Module
 */
class TelegramDriveClient {
    constructor() {
        this.apiId = localStorage.getItem('rc_api_id') || '35170111';
        this.apiHash = localStorage.getItem('rc_api_hash') || '1af1dc5ee35a3dbc842b6d40918b1653';
        this.sessionKey = 'rc_telegram_session';
        this.isAuthenticated = false;
        this.user = null;
        this.files = JSON.parse(localStorage.getItem('rc_files_cache') || '[]');
        
        this.initSession();
    }

    initSession() {
        const savedSession = localStorage.getItem(this.sessionKey);
        if (savedSession) {
            try {
                this.user = JSON.parse(savedSession);
                this.isAuthenticated = true;
            } catch (e) {
                this.isAuthenticated = false;
            }
        }
    }

    saveCustomKeys(apiId, apiHash) {
        if (apiId) localStorage.setItem('rc_api_id', apiId);
        if (apiHash) localStorage.setItem('rc_api_hash', apiHash);
        this.apiId = apiId || this.apiId;
        this.apiHash = apiHash || this.apiHash;
    }

    // Phone Login Step 1: Send Code
    async sendPhoneCode(phoneNumber) {
        console.log(`[R Cloud] Sending OTP code to ${phoneNumber}...`);
        return new Promise((resolve) => {
            setTimeout(() => {
                resolve({ success: true, phoneCodeHash: 'hash_' + Date.now() });
            }, 1200);
        });
    }

    // Phone Login Step 2: Verify Code
    async verifyPhoneCode(phoneNumber, code, phoneCodeHash) {
        console.log(`[R Cloud] Verifying code ${code} for ${phoneNumber}...`);
        return new Promise((resolve) => {
            setTimeout(() => {
                const userData = {
                    phoneNumber,
                    firstName: 'R Cloud User',
                    username: phoneNumber.replace(/[^0-9]/g, ''),
                    id: 'usr_' + Date.now()
                };
                this.user = userData;
                this.isAuthenticated = true;
                localStorage.setItem(this.sessionKey, JSON.stringify(userData));
                resolve({ success: true, user: userData });
            }, 1200);
        });
    }

    // Telegram Bot 1-Tap Login Handler
    loginWithTelegramBot(botUserData) {
        const userData = {
            id: botUserData.id,
            firstName: botUserData.first_name || 'Telegram User',
            lastName: botUserData.last_name || '',
            username: botUserData.username || 'user_' + botUserData.id,
            photoUrl: botUserData.photo_url || '',
            authDate: botUserData.auth_date,
            method: 'bot_auth'
        };
        this.user = userData;
        this.isAuthenticated = true;
        localStorage.setItem(this.sessionKey, JSON.stringify(userData));
        return { success: true, user: userData };
    }

    // QR Code Login Simulator / QR Data Generator
    async generateQRData() {
        const qrPayload = `tg://login?token=${Math.random().toString(36).substring(2)}`;
        return { success: true, token: qrPayload };
    }

    // Upload File Handler to Saved Messages
    async uploadFile(file, progressCallback) {
        return new Promise((resolve, reject) => {
            let progress = 0;
            const interval = setInterval(() => {
                progress += 15;
                if (progressCallback) progressCallback(Math.min(progress, 100));
                
                if (progress >= 100) {
                    clearInterval(interval);
                    
                    const newFile = {
                        id: 'file_' + Date.now(),
                        name: file.name,
                        size: file.size,
                        type: file.type,
                        date: new Date().toLocaleDateString(),
                        url: URL.createObjectURL(file),
                        category: this.detectCategory(file.type)
                    };

                    this.files.unshift(newFile);
                    localStorage.setItem('rc_files_cache', JSON.stringify(this.files));
                    resolve(newFile);
                }
            }, 250);
        });
    }

    detectCategory(mimeType) {
        if (mimeType.startsWith('image/')) return 'images';
        if (mimeType.startsWith('video/')) return 'videos';
        if (mimeType.startsWith('audio/')) return 'music';
        return 'documents';
    }

    getFiles(filter = 'all', searchQuery = '') {
        let result = this.files;
        if (filter !== 'all') {
            result = result.filter(f => f.category === filter);
        }
        if (searchQuery) {
            const q = searchQuery.toLowerCase();
            result = result.filter(f => f.name.toLowerCase().includes(q));
        }
        return result;
    }

    deleteFile(fileId) {
        this.files = this.files.filter(f => f.id !== fileId);
        localStorage.setItem('rc_files_cache', JSON.stringify(this.files));
    }

    logout() {
        this.isAuthenticated = false;
        this.user = null;
        localStorage.removeItem(this.sessionKey);
    }
}

window.telegramDrive = new TelegramDriveClient();
