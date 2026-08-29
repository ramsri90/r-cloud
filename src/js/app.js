/**
 * R Cloud Main App UI Controller
 */
document.addEventListener('DOMContentLoaded', () => {
    const universalDrive = window.universalDrive;
    const drive = window.telegramDrive;

    // DOM Elements
    const filesContainer = document.getElementById('filesContainer');
    const authStatusBadge = document.getElementById('authStatusBadge');
    const loginModal = document.getElementById('loginModal');
    const settingsModal = document.getElementById('settingsModal');
    const fileInput = document.getElementById('fileInput');
    const dropzone = document.getElementById('dropzone');
    const searchInput = document.getElementById('searchInput');
    const filterNavItems = document.querySelectorAll('.nav-item');
    const currentCategoryTitle = document.getElementById('currentCategoryTitle');

    let currentFilter = 'all';

    function getActiveDrive() {
        if (universalDrive && universalDrive.isAuthenticated) return universalDrive;
        return drive;
    }

    // Update Auth Status
    function updateAuthStatus() {
        if (!authStatusBadge) return;
        const activeDrive = getActiveDrive();
        if (activeDrive && activeDrive.isAuthenticated) {
            authStatusBadge.classList.add('online');
            const displayName = activeDrive.chatTitle || (activeDrive.user && (activeDrive.user.firstName || activeDrive.user.username)) || 'Connected';
            const statusText = authStatusBadge.querySelector('.status-text');
            if (statusText) statusText.textContent = displayName;
        } else {
            authStatusBadge.classList.remove('online');
            const statusText = authStatusBadge.querySelector('.status-text');
            if (statusText) statusText.textContent = 'Connect Drive';
        }
    }

    // Render Files
    function renderFiles() {
        const activeDrive = getActiveDrive();
        const searchQuery = searchInput ? searchInput.value : '';
        const files = activeDrive.getFiles(currentFilter, searchQuery);

        if (!filesContainer) return;

        if (files.length === 0) {
            filesContainer.innerHTML = `
                <div style="grid-column: 1 / -1; text-align: center; padding: 40px; color: var(--text-muted);">
                    <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" style="margin-bottom: 12px; opacity: 0.5;"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"></path></svg>
                    <p style="font-size: 15px;">No files uploaded yet.</p>
                    <p style="font-size: 13px; margin-top: 4px;">Drag and drop files or click "Upload File" above.</p>
                </div>
            `;
            return;
        }

        filesContainer.innerHTML = files.map(file => `
            <div class="file-card">
                <div class="file-preview">
                    ${getFilePreviewHTML(file)}
                </div>
                <div class="file-info">
                    <h4 title="${escapeHTML(file.name)}">${escapeHTML(file.name)}</h4>
                    <p>${formatFileSize(file.size)} • ${file.date}</p>
                </div>
                <div class="file-actions">
                    <a href="${file.url}" download="${escapeHTML(file.name)}" class="btn-icon" title="Download">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>
                    </a>
                    <button class="btn-icon delete-btn" data-id="${file.id}" title="Delete">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
                    </button>
                </div>
            </div>
        `).join('');

        // Attach Delete Listeners
        document.querySelectorAll('.delete-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const id = e.currentTarget.dataset.id;
                if (confirm('Delete this file from R Cloud?')) {
                    getActiveDrive().deleteFile(id);
                    renderFiles();
                    updateStorageUsage();
                }
            });
        });
    }

    function getFilePreviewHTML(file) {
        if (file.category === 'images') {
            return `<img src="${file.url}" alt="${escapeHTML(file.name)}" loading="lazy">`;
        }
        if (file.category === 'videos') {
            return `<video src="${file.url}" muted preload="metadata"></video>`;
        }
        if (file.category === 'music') {
            return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 18V5l12-2v13"></path><circle cx="6" cy="18" r="3"></circle><circle cx="18" cy="16" r="3"></circle></svg>`;
        }
        return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline></svg>`;
    }

    function updateStorageUsage() {
        const activeDrive = getActiveDrive();
        const files = activeDrive.getFiles('all');
        const totalBytes = files.reduce((acc, f) => acc + (f.size || 0), 0);
        const usedElem = document.getElementById('storageUsed');
        const fillElem = document.getElementById('storageFill');

        if (usedElem) usedElem.textContent = formatFileSize(totalBytes);
        if (fillElem) fillElem.style.width = Math.min((totalBytes / (2 * 1024 * 1024 * 1024)) * 100, 100) + '%';
    }

    // Upload Handler
    async function handleFilesUpload(filesList) {
        const activeDrive = getActiveDrive();
        if (!activeDrive.isAuthenticated) {
            loginModal.classList.add('active');
            return;
        }

        for (const file of filesList) {
            try {
                await activeDrive.uploadFile(file, (pct) => {
                    console.log(`Uploading ${file.name}: ${pct}%`);
                });
            } catch (err) {
                alert('Upload error: ' + err.message);
            }
        }
        renderFiles();
        updateStorageUsage();
    }

    // Event Listeners
    if (fileInput) {
        fileInput.addEventListener('change', (e) => handleFilesUpload(e.target.files));
    }

    if (dropzone) {
        dropzone.addEventListener('click', () => fileInput && fileInput.click());
        dropzone.addEventListener('dragover', (e) => {
            e.preventDefault();
            dropzone.classList.add('dragover');
        });
        dropzone.addEventListener('dragleave', () => dropzone.classList.remove('dragover'));
        dropzone.addEventListener('drop', (e) => {
            e.preventDefault();
            dropzone.classList.remove('dragover');
            if (e.dataTransfer.files) handleFilesUpload(e.dataTransfer.files);
        });
    }

    if (searchInput) {
        searchInput.addEventListener('input', renderFiles);
    }

    // Category Filter Navigation
    filterNavItems.forEach(item => {
        item.addEventListener('click', (e) => {
            e.preventDefault();
            filterNavItems.forEach(i => i.classList.remove('active'));
            item.classList.add('active');
            currentFilter = item.dataset.filter || 'all';
            if (currentCategoryTitle) {
                currentCategoryTitle.textContent = item.querySelector('span').textContent;
            }
            renderFiles();
        });
    });

    // Auth / Drive Status Badge Button
    const loginTriggerBtn = document.getElementById('loginTriggerBtn');
    if (loginTriggerBtn) {
        loginTriggerBtn.addEventListener('click', () => {
            const activeDrive = getActiveDrive();
            if (activeDrive && activeDrive.isAuthenticated) {
                openDriveDetailsModal();
            } else {
                loginModal.classList.add('active');
            }
        });
    }

    // Login Modal Tab Switcher & Connect Handlers
    const tabChatIdBtn = document.getElementById('tabChatIdBtn');
    const tabBotBtn = document.getElementById('tabBotBtn');
    const chatIdSection = document.getElementById('chatIdSection');
    const botLoginSection = document.getElementById('botLoginSection');
    const connectChatIdBtn = document.getElementById('connectChatIdBtn');
    const chatIdInput = document.getElementById('chatIdInput');

    if (tabChatIdBtn && tabBotBtn) {
        tabChatIdBtn.addEventListener('click', () => {
            tabChatIdBtn.classList.add('active');
            tabBotBtn.classList.remove('active');
            chatIdSection.style.display = 'block';
            botLoginSection.style.display = 'none';
        });
        tabBotBtn.addEventListener('click', () => {
            tabBotBtn.classList.add('active');
            tabChatIdBtn.classList.remove('active');
            botLoginSection.style.display = 'block';
            chatIdSection.style.display = 'none';
        });
    }

    if (connectChatIdBtn) {
        connectChatIdBtn.addEventListener('click', async () => {
            const chatId = chatIdInput ? chatIdInput.value : '';
            const botToken = document.getElementById('botTokenInput') ? document.getElementById('botTokenInput').value : '';
            if (!botToken && !universalDrive.botToken) return alert('Please enter your Bot Token from @BotFather');
            if (!chatId) return alert('Please enter your Telegram Channel / Group Chat ID');
            
            try {
                connectChatIdBtn.disabled = true;
                connectChatIdBtn.textContent = 'Connecting...';
                await universalDrive.connectChatId(chatId, botToken);
                alert(`✅ Successfully connected to "${universalDrive.chatTitle}"!`);
                if (settingsModal) settingsModal.classList.remove('active');
                if (loginModal) loginModal.classList.remove('active');
                updateAuthStatus();
                renderFiles();
            } catch (err) {
                alert('Connection Error: ' + err.message);
            } finally {
                connectChatIdBtn.disabled = false;
                connectChatIdBtn.textContent = 'Connect My Cloud Drive';
            }
        });
    }

    // Telegram Bot 1-Tap Global Callback
    window.onTelegramAuth = function(user) {
        console.log('[R Cloud] 1-Tap Telegram Auth User:', user);
        drive.loginWithTelegramBot(user);
        if (loginModal) loginModal.classList.remove('active');
        updateAuthStatus();
        renderFiles();
    };

    // Phone Code Step Handlers
    const sendPhoneBtn = document.getElementById('sendPhoneBtn');
    const verifyCodeBtn = document.getElementById('verifyCodeBtn');
    const phoneInputGroup = document.getElementById('phoneInputGroup');
    const codeInputGroup = document.getElementById('codeInputGroup');
    let tempPhone = '';
    let tempHash = '';

    if (sendPhoneBtn) {
        sendPhoneBtn.addEventListener('click', async () => {
            const phone = document.getElementById('phoneNumInput').value;
            if (!phone) return alert('Please enter phone number');
            tempPhone = phone;
            const res = await drive.sendPhoneCode(phone);
            tempHash = res.phoneCodeHash;
            phoneInputGroup.style.display = 'none';
            codeInputGroup.style.display = 'block';
        });
    }

    if (verifyCodeBtn) {
        verifyCodeBtn.addEventListener('click', async () => {
            const code = document.getElementById('otpCodeInput').value;
            if (!code) return alert('Please enter 5-digit code');
            await drive.verifyPhoneCode(tempPhone, code, tempHash);
            loginModal.classList.remove('active');
            updateAuthStatus();
            renderFiles();
        });
    }

    // Settings / Drive Details Modal
    const settingsBtn = document.getElementById('settingsBtn');
    const disconnectDriveBtn = document.getElementById('disconnectDriveBtn');
    const syncFilesBtn = document.getElementById('syncFilesBtn');
    const settingsDriveTitle = document.getElementById('settingsDriveTitle');
    const settingsDriveChatId = document.getElementById('settingsDriveChatId');

    function openDriveDetailsModal() {
        const activeDrive = getActiveDrive();
        const settingsConnectSection = document.getElementById('settingsConnectSection');
        const settingsConnectedSection = document.getElementById('settingsConnectedSection');
        const settingsModalHeaderTitle = document.getElementById('settingsModalHeaderTitle');

        if (activeDrive && activeDrive.isAuthenticated) {
            if (settingsModalHeaderTitle) settingsModalHeaderTitle.textContent = 'Connected Drive Details';
            if (settingsConnectSection) settingsConnectSection.style.display = 'none';
            if (settingsConnectedSection) settingsConnectedSection.style.display = 'block';
            if (settingsDriveTitle) settingsDriveTitle.textContent = activeDrive.chatTitle || 'Connected Drive';
            if (settingsDriveChatId) settingsDriveChatId.textContent = activeDrive.chatId ? `Chat ID: ${activeDrive.chatId}` : '-';
        } else {
            if (settingsModalHeaderTitle) settingsModalHeaderTitle.textContent = 'Connect R Cloud Drive';
            if (settingsConnectSection) settingsConnectSection.style.display = 'block';
            if (settingsConnectedSection) settingsConnectedSection.style.display = 'none';
        }
        if (settingsModal) settingsModal.classList.add('active');
    }

    if (settingsBtn) {
        settingsBtn.addEventListener('click', openDriveDetailsModal);
    }

    if (syncFilesBtn) {
        syncFilesBtn.addEventListener('click', async () => {
            try {
                syncFilesBtn.disabled = true;
                syncFilesBtn.textContent = '⏳ Fetching Previous Files...';
                await universalDrive.syncChannelFiles();
                renderFiles();
                updateStorageUsage();
                alert('✅ Channel files synced successfully!');
            } catch (e) {
                alert('Sync Error: ' + e.message);
            } finally {
                syncFilesBtn.disabled = false;
                syncFilesBtn.textContent = '🔄 Fetch Previous Files from Channel';
            }
        });
    }

    if (disconnectDriveBtn) {
        disconnectDriveBtn.addEventListener('click', () => {
            universalDrive.logout();
            drive.logout();
            alert('✅ Fresh Logout completed! Disconnected from Cloud Drive.');
            if (settingsModal) settingsModal.classList.remove('active');
            updateAuthStatus();
            renderFiles();
        });
    }

    document.querySelectorAll('.btn-close').forEach(btn => {
        btn.addEventListener('click', () => {
            loginModal.classList.remove('active');
            settingsModal.classList.remove('active');
        });
    });

    // Utilities
    function formatFileSize(bytes) {
        if (!bytes) return '0 B';
        const k = 1024;
        const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
    }

    function escapeHTML(str) {
        return str.replace(/[&<>'"]/g, 
            tag => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[tag] || tag)
        );
    }

    // Telegram WebApp Auto-Auth Detection (Zero-OTP, Zero-SMS Instant Login)
    if (window.Telegram && window.Telegram.WebApp) {
        try {
            window.Telegram.WebApp.ready();
            window.Telegram.WebApp.expand();
        } catch(e) {}

        const tgUser = window.Telegram.WebApp.initDataUnsafe && window.Telegram.WebApp.initDataUnsafe.user;
        if (tgUser) {
            console.log('[R Cloud] Telegram WebApp User Detected:', tgUser);
            drive.loginWithTelegramBot(tgUser);
        } else {
            // Default auto-login inside Telegram Mini App if initDataUnsafe is empty in desktop client
            if (window.location.href.includes('telegram') || window.Telegram.WebApp.platform) {
                drive.loginWithTelegramBot({ id: 'tg_user', first_name: 'Telegram User' });
            }
        }
    }

    // Initial Setup & Sync
    updateAuthStatus();
    renderFiles();
    updateStorageUsage();

    if (universalDrive && universalDrive.isAuthenticated) {
        universalDrive.syncChannelFiles().then(() => {
            renderFiles();
            updateStorageUsage();
        });
    }
});
