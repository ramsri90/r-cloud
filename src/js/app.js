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
                    <button class="btn-icon" title="View / Play" onclick="window.openMediaViewer('${file.id}')">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle></svg>
                    </button>
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
            return `<img src="${file.url}" alt="${escapeHTML(file.name)}" loading="lazy" style="cursor: pointer;" onclick="window.openMediaViewer('${file.id}')">`;
        }
        if (file.category === 'videos') {
            return `
                <div style="position: relative; width: 100%; height: 100%; cursor: pointer;" onclick="window.openMediaViewer('${file.id}')">
                    <video src="${file.url}" muted preload="metadata" style="width: 100%; height: 100%; object-fit: cover;"></video>
                    <div style="position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); background: rgba(0,0,0,0.6); border-radius: 50%; width: 44px; height: 44px; display: flex; align-items: center; justify-content: center; backdrop-filter: blur(4px);">
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="#65de69"><polygon points="5 3 19 12 5 21 5 3"></polygon></svg>
                    </div>
                </div>`;
        }
        if (file.category === 'music') {
            return `
                <div style="display: flex; flex-direction: column; align-items: center; justify-content: center; width: 100%; height: 100%; gap: 8px; cursor: pointer;" onclick="window.openMediaViewer('${file.id}')">
                    <svg viewBox="0 0 24 24" fill="none" stroke="var(--accent)" stroke-width="2" width="40" height="40"><path d="M9 18V5l12-2v13"></path><circle cx="6" cy="18" r="3"></circle><circle cx="18" cy="16" r="3"></circle></svg>
                    <span style="font-size: 11px; color: var(--accent); font-weight: 600;">▶ Listen Audio</span>
                </div>`;
        }
        return `
            <div style="display: flex; flex-direction: column; align-items: center; justify-content: center; width: 100%; height: 100%; gap: 8px; cursor: pointer;" onclick="window.openMediaViewer('${file.id}')">
                <svg viewBox="0 0 24 24" fill="none" stroke="var(--accent)" stroke-width="2" width="40" height="40"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline></svg>
                <span style="font-size: 11px; color: var(--text-secondary); font-weight: 600;">👁 View Document</span>
            </div>`;
    }

    window.openMediaViewer = function(fileId) {
        const activeDrive = getActiveDrive();
        const files = activeDrive.getFiles('all');
        const file = files.find(f => f.id === fileId);
        if (!file) return;

        const modal = document.getElementById('mediaViewerModal');
        const title = document.getElementById('mediaViewerTitle');
        const body = document.getElementById('mediaViewerBody');
        const downloadBtn = document.getElementById('mediaViewerDownloadBtn');

        if (title) title.textContent = file.name;

        const mediaSrc = file.url || file.localUrl || '#';
        if (downloadBtn) {
            downloadBtn.href = mediaSrc;
            downloadBtn.setAttribute('download', file.name);
        }

        if (file.category === 'images') {
            body.innerHTML = `<img id="mediaElement" src="${mediaSrc}" alt="${escapeHTML(file.name)}" style="max-width: 100%; max-height: 70vh; object-fit: contain; border-radius: 8px;">`;
        } else if (file.category === 'videos') {
            body.innerHTML = `<video id="mediaElement" src="${mediaSrc}" controls autoplay style="max-width: 100%; max-height: 70vh; border-radius: 8px; outline: none;"></video>`;
        } else if (file.category === 'music') {
            body.innerHTML = `
                <div style="display: flex; flex-direction: column; align-items: center; gap: 20px; padding: 30px;">
                    <div style="width: 80px; height: 80px; background: rgba(101,222,105,0.1); border-radius: 50%; display: flex; align-items: center; justify-content: center; box-shadow: 0 0 30px var(--accent-glow);">
                        <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" stroke-width="2"><path d="M9 18V5l12-2v13"></path><circle cx="6" cy="18" r="3"></circle><circle cx="18" cy="16" r="3"></circle></svg>
                    </div>
                    <audio id="mediaElement" src="${mediaSrc}" controls autoplay style="width: 320px; outline: none;"></audio>
                </div>`;
        } else {
            body.innerHTML = `
                <div style="display: flex; flex-direction: column; align-items: center; gap: 16px; padding: 30px; text-align: center;">
                    <svg width="60" height="60" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" stroke-width="1.5"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline></svg>
                    <p style="font-size: 14px; color: var(--text-secondary);">${escapeHTML(file.name)} (${formatFileSize(file.size)})</p>
                    <a href="${mediaSrc}" target="_blank" class="btn btn-secondary" style="text-decoration: none;">🔗 Open Document in New Tab</a>
                </div>`;
        }

        // Open modal INSTANTLY (0ms latency, zero freeze!)
        if (modal) modal.classList.add('active');

        // Non-blocking background URL refresh if fileId exists
        if (file.fileId && activeDrive.getFileDownloadUrl) {
            activeDrive.getFileDownloadUrl(file.fileId).then(freshUrl => {
                if (freshUrl && freshUrl !== file.url) {
                    file.url = freshUrl;
                    const mediaElement = document.getElementById('mediaElement');
                    if (mediaElement) mediaElement.src = freshUrl;
                    if (downloadBtn) downloadBtn.href = freshUrl;
                }
            }).catch(err => console.warn('URL refresh error:', err));
        }
    };

    const closeMediaViewerBtn = document.getElementById('closeMediaViewerBtn');
    if (closeMediaViewerBtn) {
        closeMediaViewerBtn.addEventListener('click', () => {
            const modal = document.getElementById('mediaViewerModal');
            const body = document.getElementById('mediaViewerBody');
            if (body) body.innerHTML = '';
            if (modal) modal.classList.remove('active');
        });
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

    // Upload Handler with Dual Progress Indicators (Central Modal + Top Floating Sticky Banner)
    async function handleFilesUpload(filesList) {
        const activeDrive = getActiveDrive();
        if (!activeDrive.isAuthenticated) {
            if (settingsModal) settingsModal.classList.add('active');
            return;
        }

        const uploadProgressModal = document.getElementById('uploadProgressModal');
        const uploadFileName = document.getElementById('uploadFileName');
        const uploadStatusText = document.getElementById('uploadStatusText');
        const uploadProgressBarFill = document.getElementById('uploadProgressBarFill');
        const uploadPercentageText = document.getElementById('uploadPercentageText');

        const topUploadBanner = document.getElementById('topUploadBanner');
        const topUploadFileName = document.getElementById('topUploadFileName');
        const topUploadFill = document.getElementById('topUploadFill');
        const topUploadPct = document.getElementById('topUploadPct');

        for (const file of filesList) {
            try {
                if (uploadFileName) uploadFileName.textContent = `Uploading ${file.name}...`;
                if (uploadStatusText) uploadStatusText.textContent = `File Size: ${formatFileSize(file.size)} • Transferring to Telegram Unlimited Storage`;
                if (uploadProgressBarFill) uploadProgressBarFill.style.width = '0%';
                if (uploadPercentageText) uploadPercentageText.textContent = '0%';

                if (topUploadFileName) topUploadFileName.textContent = file.name;
                if (topUploadFill) topUploadFill.style.width = '0%';
                if (topUploadPct) topUploadPct.textContent = '0%';

                if (uploadProgressModal) uploadProgressModal.classList.add('active');
                if (topUploadBanner) topUploadBanner.style.display = 'flex';

                await activeDrive.uploadFile(file, (pct) => {
                    if (uploadProgressBarFill) uploadProgressBarFill.style.width = `${pct}%`;
                    if (uploadPercentageText) uploadPercentageText.textContent = `${pct}%`;
                    if (topUploadFill) topUploadFill.style.width = `${pct}%`;
                    if (topUploadPct) topUploadPct.textContent = `${pct}%`;
                });

                if (uploadProgressBarFill) uploadProgressBarFill.style.width = '100%';
                if (uploadPercentageText) uploadPercentageText.textContent = '100% • Upload Completed! 🎉';
                if (topUploadFill) topUploadFill.style.width = '100%';
                if (topUploadPct) topUploadPct.textContent = '100%';

                await new Promise(r => setTimeout(r, 600));
            } catch (err) {
                alert('Upload Error: ' + err.message);
            } finally {
                if (uploadProgressModal) uploadProgressModal.classList.remove('active');
                if (topUploadBanner) topUploadBanner.style.display = 'none';
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
