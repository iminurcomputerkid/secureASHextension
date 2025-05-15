// popup.js
const API_URL = "https://secure-asf-password-manager.onrender.com";

let username = null;
let masterPassword = null;
let is2FAVerified = false;

document.addEventListener('DOMContentLoaded', () => {
  // HEADER & NAV
  const headerTitle   = document.querySelector('header h1');
  const backBtn       = document.getElementById('back-btn');
  const logoutBtn     = document.getElementById('logout-btn');

  // PAGES
  const pages = {
    login:       document.getElementById('page-login'),
    menu:        document.getElementById('page-menu'),
    credentials: document.getElementById('page-credentials'),
    wallets:     document.getElementById('page-wallets'),
    docs:        document.getElementById('page-docs'),
    settings:    document.getElementById('page-settings')
  };

  // LOGIN FORM
  const loginForm = document.getElementById('login-form');
  const loginBtn  = loginForm.querySelector('button[type="submit"]');

  // MAIN MENU BUTTONS
  const menuButtons = document.querySelectorAll('#main-menu button');

  // VAULT LISTS & ADD BUTTONS
  const credentialsList = document.getElementById('credentials-list');
  const addCredBtn      = document.getElementById('add-credential-btn');
  const walletsList     = document.getElementById('wallets-list');
  const addWalletBtn    = document.getElementById('add-wallet-btn');
  const documentsList   = document.getElementById('documents-list');
  const addDocBtn       = document.getElementById('add-document-btn');

  // ACCOUNT SETTINGS BUTTONS
  const changePwdBtn  = document.getElementById('change-password-btn');
  const enable2FABtn  = document.getElementById('enable-2fa-btn');
  const disable2FABtn = document.getElementById('disable-2fa-btn');
  const deleteAllBtn  = document.getElementById('delete-all-data-btn');

  // MODAL ELEMENTS
  const modal      = document.getElementById('modal');
  const modalBody  = document.getElementById('modal-body');
  const modalClose = document.getElementById('modal-close');
  modalClose.onclick = closeModal;
  window.onclick     = e => { if (e.target === modal) closeModal(); };

  // UTILITIES
  function showPage(key) {
    Object.values(pages).forEach(p => p.style.display = 'none');
    pages[key].style.display = 'block';

    if (key === 'login') {
      backBtn.style.display      = 'none';
      logoutBtn.style.display    = 'none';
      headerTitle.style.display  = 'block';
    } else if (key === 'menu') {
      backBtn.style.display      = 'none';
      logoutBtn.style.display    = 'inline-block';
      headerTitle.style.display  = 'block';
    } else {
      backBtn.style.display      = 'inline-block';
      logoutBtn.style.display    = 'inline-block';
      headerTitle.style.display  = 'none';
    }
  }

  function setLoading(btn, isLoading) {
    if (isLoading) btn.classList.add('loading');
    else           btn.classList.remove('loading');
  }

  function openModal()  { modal.style.display = 'flex'; }
  function closeModal() { modal.style.display = 'none'; modalBody.innerHTML = ''; }

  // NAVIGATION
  loginForm.addEventListener('submit', onLogin);
  logoutBtn.addEventListener('click', onLogout);
  backBtn.addEventListener('click', () => showPage('menu'));

  menuButtons.forEach(btn => {
    btn.addEventListener('click', async () => {
      setLoading(btn, true);
      const key = btn.dataset.page.split('page-')[1];
      showPage(key);
      if (key === 'credentials') await loadCredentials();
      if (key === 'wallets')     await loadWallets();
      if (key === 'docs')        await loadDocuments();
      setLoading(btn, false);
    });
  });

  // AUTH
  async function onLogin(e) {
    e.preventDefault();
    username       = loginForm.username.value.trim();
    masterPassword = loginForm.password.value;
    setLoading(loginBtn, true);

    try {
      const resp = await fetch(`${API_URL}/login`, {
        method: 'POST',
        headers: {'Content-Type':'application/json'},
        body: JSON.stringify({ username, master_password: masterPassword })
      });

      if (resp.ok) {
        is2FAVerified = true;
        return finishLogin();
      }

      if (resp.status === 403) {
        const err = await resp.json();
        if (err.detail && err.detail.toLowerCase().includes('totp')) {
          return prompt2FA();
        }
        throw new Error(err.detail || 'Access denied');
      }

      if (resp.status === 401) {
        throw new Error('Invalid credentials');
      }

      throw new Error('Login failed');
    } catch (err) {
      alert(err.message);
    } finally {
      setLoading(loginBtn, false);
    }
  }

  function finishLogin() {
    closeModal();
    showPage('menu');
  }

  function prompt2FA() {
    modalBody.innerHTML = `
      <h3>Enter 2FA Code</h3>
      <div id="m-2fa-error" class="error-msg"></div>
      <label>CODE<input id="m-2fa" type="text" maxlength="6"/></label>
      <button id="m-2fa-verify" class="accent-btn">VERIFY</button>
    `;

    document.getElementById('m-2fa-verify').onclick = async e => {
      const code   = document.getElementById('m-2fa').value.trim();
      const errDiv = document.getElementById('m-2fa-error');
      errDiv.textContent = '';

      if (!code) {
        errDiv.textContent = 'Please enter your 2FA code';
        return;
      }

      setLoading(e.target, true);
      try {
        const resp = await fetch(`${API_URL}/login`, {
          method: 'POST',
          headers: {'Content-Type':'application/json'},
          body: JSON.stringify({ username, master_password: masterPassword, totp_code: code })
        });

        if (!resp.ok) {
          const err = await resp.json().catch(() => ({ detail: 'Wrong 2FA code' }));
          throw new Error(err.detail);
        }

        is2FAVerified = true;
        finishLogin();
      } catch (err) {
        errDiv.textContent = err.message;
      } finally {
        setLoading(e.target, false);
      }
    };

    openModal();
  }

  function onLogout() {
    username = masterPassword = null;
    is2FAVerified = false;
    loginForm.reset();
    showPage('login');
  }

  // CREDENTIALS
  addCredBtn.addEventListener('click', () => {
    modalBody.innerHTML = `
      <h3>New Credential</h3>
      <label>SITE NAME<input id="m-site" type="text"/></label>
      <label>USERNAME<input id="m-user" type="text"/></label>
      <label>PASSWORD<input id="m-pass" type="password"/></label>
      <button id="m-submit" class="accent-btn">SAVE</button>
    `;
    document.getElementById('m-submit').onclick = async e => {
      const site = document.getElementById('m-site').value.trim();
      const su   = document.getElementById('m-user').value;
      const sp   = document.getElementById('m-pass').value;
      if (!site||!su||!sp) return;

      setLoading(e.target, true);
      await fetch(`${API_URL}/add_credentials`, {
        method:'POST',
        headers:{'Content-Type':'application/json'},
        body: JSON.stringify({ username, master_password: masterPassword, site, s_username: su, s_password: sp })
      });
      setLoading(e.target, false);
      closeModal();
      await loadCredentials();
    };
    openModal();
  });

  async function loadCredentials() {
    credentialsList.innerHTML = '';
    const resp = await fetch(`${API_URL}/get_all_sites`, {
      method:'POST',
      headers:{'Content-Type':'application/json'},
      body: JSON.stringify({ username })
    });
    const { sites = [] } = await resp.json();

    for (const site of sites) {
      const li = document.createElement('li');
      li.innerHTML = `
        <span>${site}</span>
        <button class="view-cred">View</button>
        <button class="delete-cred">Delete</button>
      `;
      const viewBtn = li.querySelector('.view-cred');
      const delBtn  = li.querySelector('.delete-cred');

      viewBtn.onclick = async () => {
        setLoading(viewBtn, true);
        const respCred = await fetch(`${API_URL}/get_credentials`, {
          method:'POST',
          headers:{'Content-Type':'application/json'},
          body: JSON.stringify({ username, master_password: masterPassword, site })
        });
        const data = await respCred.json();
        setLoading(viewBtn, false);

        if (!is2FAVerified &&
            respCred.status === 403 &&
            data.detail.toLowerCase().includes('totp')) {
          return promptTOTPForView(site);
        }

        if (!respCred.ok) {
          modalBody.innerHTML = `
            <h3>${site}</h3>
            <div class="error-msg">${data.detail || 'Failed to load credentials'}</div>
          `;
          return openModal();
        }

        modalBody.innerHTML = `
          <h3>${site}</h3>
          <div><strong>Username:</strong> <span>${data.username}</span>
            <button class="copy-btn" onclick="navigator.clipboard.writeText('${data.username}')">Copy</button>
          </div>
          <div><strong>Password:</strong> <span>${data.password}</span>
            <button class="copy-btn" onclick="navigator.clipboard.writeText('${data.password}')">Copy</button>
          </div>
        `;
        openModal();
      };

      delBtn.onclick = async () => {
        if (!confirm(`Delete "${site}"?`)) return;
        await fetch(`${API_URL}/delete_credentials`, {
          method:'POST',
          headers:{'Content-Type':'application/json'},
          body: JSON.stringify({ username, site })
        });
        await loadCredentials();
      };

      credentialsList.append(li);
    }
  }

  function promptTOTPForView(site) {
    modalBody.innerHTML = `
      <h3>${site}</h3>
      <div id="m-view-2fa-error" class="error-msg"></div>
      <label>2FA Code<input id="m-view-2fa" type="text" maxlength="6"/></label>
      <button id="m-view-2fa-verify" class="accent-btn">VERIFY</button>
    `;
    document.getElementById('m-view-2fa-verify').onclick = async e => {
      const code   = document.getElementById('m-view-2fa').value.trim();
      const errDiv = document.getElementById('m-view-2fa-error');
      errDiv.textContent = '';
      if (!code) {
        errDiv.textContent = 'Please enter your 2FA code';
        return;
      }
      setLoading(e.target, true);

      const resp2 = await fetch(`${API_URL}/get_credentials`, {
        method:'POST',
        headers:{'Content-Type':'application/json'},
        body: JSON.stringify({ username, master_password: masterPassword, site, totp_code: code })
      });
      const data2 = await resp2.json();
      setLoading(e.target, false);

      if (!resp2.ok) {
        errDiv.textContent = data2.detail || 'Wrong 2FA code';
        return;
      }

      is2FAVerified = true;
      modalBody.innerHTML = `
        <h3>${site}</h3>
        <div><strong>Username:</strong> <span>${data2.username}</span>
          <button class="copy-btn" onclick="navigator.clipboard.writeText('${data2.username}')">Copy</button>
        </div>
        <div><strong>Password:</strong> <span>${data2.password}</span>
          <button class="copy-btn" onclick="navigator.clipboard.writeText('${data2.password}')">Copy</button>
        </div>
      `;
      openModal();
    };
    openModal();
  }

  // WALLETS
  addWalletBtn.addEventListener('click', () => {
    modalBody.innerHTML = `
      <h3>New Wallet</h3>
      <label>NAME    <input id="m-wname" type="text"/></label>
      <label>USERNAME<input id="m-wuser" type="text"/></label>
      <label>PASSWORD<input id="m-wpass" type="password"/></label>
      <label>RECOVERY<input id="m-phrase" type="text"/></label>
      <label>PIN     <input id="m-pin" type="password"/></label>
      <button id="m-wsubmit" class="accent-btn">SAVE</button>
    `;
    document.getElementById('m-wsubmit').onclick = async e => {
      const name = document.getElementById('m-wname').value.trim();
      const u    = document.getElementById('m-wuser').value;
      const p    = document.getElementById('m-wpass').value;
      const rp   = document.getElementById('m-phrase').value;
      const pin  = document.getElementById('m-pin').value;
      if (!name||!u||!p||!rp||!pin) return;
      setLoading(e.target, true);
      await fetch(`${API_URL}/add_wallet`, {
        method:'POST',
        headers:{'Content-Type':'application/json'},
        body: JSON.stringify({ username, master_password: masterPassword, wallet_name: name, w_username: u, w_password: p, recovery_phrase: rp, pin })
      });
      setLoading(e.target, false);
      closeModal();
      await loadWallets();
    };
    openModal();
  });

  async function loadWallets() {
    walletsList.innerHTML = '';
    const resp = await fetch(`${API_URL}/get_all_wallets`, {
      method:'POST',
      headers:{'Content-Type':'application/json'},
      body: JSON.stringify({ username })
    });
    const { wallets = [] } = await resp.json();

    for (const name of wallets) {
      const li = document.createElement('li');
      li.innerHTML = `
        <span>${name}</span>
        <button class="view-wallet">View</button>
        <button class="delete-wallet">Delete</button>
      `;
      const viewBtn = li.querySelector('.view-wallet');
      const delBtn  = li.querySelector('.delete-wallet');

      viewBtn.onclick = () => {
        modalBody.innerHTML = `
          <h3>${name}</h3>
          <label>PIN<input id="m-pin-view" type="password"/></label>
          <button id="m-view-wallet" class="accent-btn">LOAD</button>
        `;
        document.getElementById('m-view-wallet').onclick = async e => {
          const pin = document.getElementById('m-pin-view').value;
          if (!pin) return;
          setLoading(e.target, true);
          const r = await fetch(`${API_URL}/get_wallet`, {
            method:'POST',
            headers:{'Content-Type':'application/json'},
            body: JSON.stringify({ username, master_password: masterPassword, wallet_name: name, pin })
          });
          setLoading(e.target, false);
          const { w_username, w_password, recovery_phrase } = await r.json();
          modalBody.innerHTML = `
            <h3>${name}</h3>
            <div><strong>Username:</strong> <span id="w-user">${w_username}</span>
              <button id="copy-wuser" class="copy-btn">Copy</button>
            </div>
            <div><strong>Password:</strong> <span id="w-pass">${w_password}</span>
              <button id="copy-wpass" class="copy-btn">Copy</button>
            </div>
            <div><strong>Recovery:</strong> <span id="w-phrase">${recovery_phrase}</span>
              <button id="copy-phrase" class="copy-btn">Copy</button>
            </div>
          `;
          document.getElementById('copy-wuser').onclick  = () => navigator.clipboard.writeText(w_username);
          document.getElementById('copy-wpass').onclick  = () => navigator.clipboard.writeText(w_password);
          document.getElementById('copy-phrase').onclick = () => navigator.clipboard.writeText(recovery_phrase);
        };
        openModal();
      };

      delBtn.onclick = async () => {
        if (!confirm(`Delete "${name}"?`)) return;
        await fetch(`${API_URL}/delete_wallet`, {
          method:'POST',
          headers:{'Content-Type':'application/json'},
          body: JSON.stringify({ username, wallet_name: name })
        });
        await loadWallets();
      };

      walletsList.append(li);
    }
  }

  // DOCUMENTS
  addDocBtn.addEventListener('click', () => {
    modalBody.innerHTML = `
      <h3>New Document</h3>
      <label>NAME<input id="m-dname" type="text"/></label>
      <label>CONTENTS<textarea id="m-dtxt"></textarea></label>
      <button id="m-dsubmit" class="accent-btn">SAVE</button>
    `;
    document.getElementById('m-dsubmit').onclick = async e => {
      const name = document.getElementById('m-dname').value.trim();
      const txt  = document.getElementById('m-dtxt').value;
      if (!name||!txt) return;
      setLoading(e.target, true);
      await fetch(`${API_URL}/add_secure_doc`, {
        method:'POST',
        headers:{'Content-Type':'application/json'},
        body: JSON.stringify({ username, master_password: masterPassword, doc_name: name, doc_contents: txt })
      });
      setLoading(e.target, false);
      closeModal();
      await loadDocuments();
    };
    openModal();
  });

  async function loadDocuments() {
    documentsList.innerHTML = '';
    const r = await fetch(`${API_URL}/get_all_docs?username=${encodeURIComponent(username)}`);
    const { documents = [] } = await r.json();

    for (const name of documents) {
      const li = document.createElement('li');
      li.innerHTML = `
        <span>${name}</span>
        <button class="view-doc">View</button>
        <button class="update-doc">Update</button>
        <button class="delete-doc">Delete</button>
      `;
      const viewBtn   = li.querySelector('.view-doc');
      const updateBtn = li.querySelector('.update-doc');
      const delBtn    = li.querySelector('.delete-doc');

      viewBtn.onclick = async () => {
        setLoading(viewBtn, true);
        const res = await fetch(`${API_URL}/get_secure_doc`, {
          method:'POST',
          headers:{'Content-Type':'application/json'},
          body: JSON.stringify({ username, master_password: masterPassword, doc_name: name })
        });
        setLoading(viewBtn, false);
        const { contents } = await res.json();
        modalBody.innerHTML = `
          <h3>${name}</h3>
          <pre id="d-contents">${contents}</pre>
          <button id="copy-doc" class="copy-btn">Copy All</button>
        `;
        document.getElementById('copy-doc').onclick = () =>
          navigator.clipboard.writeText(contents);
        openModal();
      };

      updateBtn.onclick = () => {
        modalBody.innerHTML = `
          <h3>Update "${name}"</h3>
          <label>NEW CONTENTS<textarea id="m-newdoc"></textarea></label>
          <button id="m-dupdate" class="accent-btn">UPDATE</button>
        `;
        document.getElementById('m-dupdate').onclick = async e => {
          const txt = document.getElementById('m-newdoc').value;
          if (txt == null) return;
          setLoading(e.target, true);
          await fetch(`${API_URL}/update_secure_doc`, {
            method:'POST',
            headers:{'Content-Type':'application/json'},
            body: JSON.stringify({ username, master_password: masterPassword, doc_name: name, new_contents: txt })
          });
          setLoading(e.target, false);
          closeModal();
          await loadDocuments();
        };
        openModal();
      };

      delBtn.onclick = async () => {
        if (!confirm(`Delete "${name}"?`)) return;
        await fetch(`${API_URL}/delete_secure_doc`, {
          method:'POST',
          headers:{'Content-Type':'application/json'},
          body: JSON.stringify({ username, doc_name: name })
        });
        await loadDocuments();
      };

      documentsList.append(li);
    }
  }

  // SETTINGS
  changePwdBtn.onclick = () => {
    modalBody.innerHTML = `
      <h3>Change Password</h3>
      <label>OLD<input id="m-oldp" type="password"/></label>
      <label>NEW<input id="m-newp" type="password"/></label>
      <label>CONFIRM<input id="m-confp" type="password"/></label>
      <button id="m-pass-save" class="accent-btn">SAVE</button>
    `;
    document.getElementById('m-pass-save').onclick = async e => {
      const oldp = document.getElementById('m-oldp').value;
      const newp = document.getElementById('m-newp').value;
      const conf = document.getElementById('m-confp').value;
      if (!oldp||!newp||conf!==newp) return;
      setLoading(e.target, true);
      await fetch(`${API_URL}/reset_master_password`, {
        method:'POST',
        headers:{'Content-Type':'application/json'},
        body: JSON.stringify({ username, old_master_password: oldp, new_master_password: newp })
      });
      setLoading(e.target, false);
      masterPassword = newp;
      closeModal();
    };
    openModal();
  };

  enable2FABtn.onclick = async () => {
    setLoading(enable2FABtn, true);
    const r = await fetch(`${API_URL}/enable_2fa`, {
      method:'POST',
      headers:{'Content-Type':'application/json'},
      body: JSON.stringify({ username })
    });
    setLoading(enable2FABtn, false);
    const { totp_secret, provisioning_uri } = await r.json();
    modalBody.innerHTML = `
      <h3>2FA Enabled</h3>
      <div>Secret: <code>${totp_secret}</code></div>
      <div>URI: <code>${provisioning_uri}</code></div>
      <button id="copy-2fa-secret" class="copy-btn">Copy Secret</button>
    `;
    document.getElementById('copy-2fa-secret').onclick = () =>
      navigator.clipboard.writeText(totp_secret);
    openModal();
  };

  disable2FABtn.onclick = () => {
    modalBody.innerHTML = `
      <h3>Disable 2FA</h3>
      <label>PIN<input id="m-disable-pin" type="password"/></label>
      <button id="m-disable-save" class="accent-btn">DISABLE</button>
    `;
    document.getElementById('m-disable-save').onclick = async e => {
      const pin = document.getElementById('m-disable-pin').value.trim();
      if (!pin) return;
      setLoading(e.target, true);
      await fetch(`${API_URL}/disable_2fa`, {
        method:'POST',
        headers:{'Content-Type':'application/json'},
        body: JSON.stringify({ username, pin })
      });
      setLoading(e.target, false);
      closeModal();
    };
    openModal();
  };

  deleteAllBtn.onclick = () => {
    modalBody.innerHTML = `
      <h3>Delete ALL Data</h3>
      <label>PIN<input id="m-del-pin" type="password"/></label>
      <button id="m-del-save" class="accent-btn">DELETE</button>
    `;
    document.getElementById('m-del-save').onclick = async e => {
      const pin = document.getElementById('m-del-pin').value.trim();
      if (!pin) return;
      setLoading(e.target, true);
      await fetch(`${API_URL}/delete_all_data`, {
        method:'POST',
        headers:{'Content-Type':'application/json'},
        body: JSON.stringify({ username, pin })
      });
      setLoading(e.target, false);
      closeModal();
      onLogout();
    };
    openModal();
  };

  // INITIALIZE
  showPage('login');
});
