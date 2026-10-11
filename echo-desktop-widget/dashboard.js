(() => {
  const storage = window.localStorage;
  const session = window.sessionStorage;
  const readJson = (source, key, fallback) => {
    try {
      return JSON.parse(source.getItem(key)) ?? fallback;
    } catch {
      return fallback;
    }
  };

  const preferences = readJson(storage, 'echo.preferences', {
    apiBase: window.ECHO_API_BASE || '',
    accessCode: '',
    rememberChat: false,
    reminders: false,
    quiet: false
  });
  let tasks = readJson(storage, 'echo.tasks', []);
  let conversation = preferences.rememberChat
    ? readJson(storage, 'echo.chat', [])
    : readJson(session, 'echo.session-chat', []);
  const defaultFocus = { remainingSeconds: 25 * 60, endsAt: null };
  let focusState = readJson(storage, 'echo.focus', defaultFocus);
  let focusRemainingSeconds = focusState.endsAt
    ? Math.max(0, Math.ceil((focusState.endsAt - Date.now()) / 1000))
    : focusState.remainingSeconds;
  let focusTimer = null;
  if (focusState.endsAt && focusRemainingSeconds === 0) {
    focusState = { remainingSeconds: 0, endsAt: null };
    storage.setItem('echo.focus', JSON.stringify(focusState));
  }

  const clockDate = new Date();
  document.getElementById('today-date').textContent = clockDate.toLocaleDateString([], {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric'
  });

  const renderGreeting = () => {
    const hour = new Date().getHours();
    const greeting = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening';
    const openCount = tasks.filter((task) => !task.done).length;
    document.getElementById('day-greeting').textContent = openCount
      ? `${greeting}. You have ${openCount} ${openCount === 1 ? 'priority' : 'priorities'} on your list. We can take them one at a time.`
      : `${greeting}. Your list is clear for now. What would make today feel good?`;
  };

  const renderTasks = () => {
    const list = document.getElementById('task-list');
    list.replaceChildren();
    const openCount = tasks.filter((task) => !task.done).length;
    document.getElementById('priority-count').textContent = `${openCount} open`;
    document.getElementById('priority-summary').textContent = tasks.length
      ? `${openCount ? 'Choose one to begin; the rest can wait.' : 'Everything on your list is complete.'}`
      : 'Add what matters today. You can adjust the plan anytime.';

    if (!tasks.length) {
      const empty = document.createElement('li');
      empty.className = 'empty-state';
      empty.textContent = 'Nothing on the list yet. Start with one small thing you’d like to make space for.';
      list.append(empty);
      renderGreeting();
      return;
    }

    tasks.forEach((task, index) => {
      const item = document.createElement('li');
      item.className = `dashboard-task-item${task.done ? ' done' : ''}`;
      const checkbox = document.createElement('input');
      checkbox.type = 'checkbox';
      checkbox.checked = Boolean(task.done);
      checkbox.setAttribute('aria-label', `Complete ${task.text}`);
      checkbox.addEventListener('change', () => {
        tasks[index].done = checkbox.checked;
        storage.setItem('echo.tasks', JSON.stringify(tasks));
        renderTasks();
      });

      const name = document.createElement('span');
      name.className = 'task-name';
      name.textContent = task.text;
      item.append(checkbox, name);

      if (task.dueAt) {
        const due = document.createElement('time');
        due.dateTime = task.dueAt;
        due.textContent = new Date(task.dueAt).toLocaleString([], {
          month: 'numeric',
          day: 'numeric',
          hour: 'numeric',
          minute: '2-digit'
        });
        item.append(due);
      } else {
        item.append(document.createElement('span'));
      }

      const remove = document.createElement('button');
      remove.type = 'button';
      remove.className = 'task-remove';
      remove.textContent = '×';
      remove.setAttribute('aria-label', `Remove ${task.text}`);
      remove.addEventListener('click', () => {
        tasks.splice(index, 1);
        storage.setItem('echo.tasks', JSON.stringify(tasks));
        renderTasks();
      });
      item.append(remove);
      list.append(item);
    });
    renderGreeting();
  };

  const renderChat = () => {
    const stream = document.getElementById('chat-stream');
    stream.replaceChildren();
    conversation.forEach((message) => {
      const bubble = document.createElement('div');
      bubble.className = `dashboard-chat-message${message.role === 'user' ? ' user' : ''}`;
      bubble.textContent = message.content;
      stream.append(bubble);
    });
    stream.scrollTop = stream.scrollHeight;
  };

  const addMessage = (role, content) => {
    conversation.push({ role, content });
    conversation = conversation.slice(-20);
    session.setItem('echo.session-chat', JSON.stringify(conversation));
    if (preferences.rememberChat) storage.setItem('echo.chat', JSON.stringify(conversation));
    renderChat();
  };

  const updateConnection = async () => {
    const apiBase = preferences.apiBase || window.ECHO_API_BASE || '';
    const state = document.getElementById('connection-state');
    if (!apiBase) {
      state.textContent = 'Local mode';
      return;
    }
    state.textContent = 'Checking AI...';
    try {
      const response = await fetch(`${apiBase}/health`);
      const result = await response.json();
      state.textContent = !response.ok ? 'AI unavailable' : result.chatReady ? 'AI configured' : 'AI setup needed';
    } catch {
      state.textContent = 'AI unavailable';
    }
  };

  const sendHostMessage = (message) => {
    if (window.ECHO_DESKTOP_HOST === true) window.chrome.webview.postMessage(message);
  };

  document.getElementById('widget-view').addEventListener('click', () => {
    if (window.ECHO_DESKTOP_HOST === true) sendHostMessage('widget');
    else window.location.href = 'index.html';
  });
  document.querySelector('.wordmark').addEventListener('click', (event) => {
    if (window.ECHO_DESKTOP_HOST !== true) return;
    event.preventDefault();
    sendHostMessage('widget');
  });

  document.getElementById('open-chat').addEventListener('click', () => {
    document.getElementById('conversation').scrollIntoView({ behavior: 'smooth' });
    document.getElementById('chat-input').focus({ preventScroll: true });
  });

  document.getElementById('task-form').addEventListener('submit', (event) => {
    event.preventDefault();
    const input = document.getElementById('task-input');
    const text = input.value.trim();
    if (!text) return;
    const dueValue = document.getElementById('task-due').value;
    tasks.push({
      id: crypto.randomUUID(),
      text,
      done: false,
      createdAt: Date.now(),
      dueAt: dueValue ? new Date(dueValue).toISOString() : null,
      reminded: false
    });
    storage.setItem('echo.tasks', JSON.stringify(tasks));
    input.value = '';
    document.getElementById('task-due').value = '';
    renderTasks();
    addMessage('assistant', 'Added to your priorities. We’ll keep it in view.');
  });

  const renderFocus = () => {
    if (focusState.endsAt) {
      focusRemainingSeconds = Math.max(0, Math.ceil((focusState.endsAt - Date.now()) / 1000));
    }
    const complete = focusRemainingSeconds === 0 && !focusState.endsAt;
    const displaySeconds = Math.max(0, focusRemainingSeconds);
    document.getElementById('focus-time').textContent =
      `${String(Math.floor(displaySeconds / 60)).padStart(2, '0')}:${String(displaySeconds % 60).padStart(2, '0')}`;
    document.getElementById('focus-button').textContent = focusState.endsAt
      ? 'Pause focus'
      : complete ? 'Start again' : 'Start focus';
    document.getElementById('focus-caption').textContent = focusState.endsAt
      ? 'Your focus session is underway.'
      : complete ? 'That was a solid stretch. Take a breath.'
      : focusRemainingSeconds < 25 * 60 ? 'Ready when you are.'
      : 'A gentle 25-minute session';
    document.getElementById('focus-progress').style.width =
      `${Math.max(0, Math.min(100, (1 - displaySeconds / (25 * 60)) * 100))}%`;
  };

  const finishFocus = () => {
    focusRemainingSeconds = 0;
    focusState = { remainingSeconds: 0, endsAt: null };
    storage.setItem('echo.focus', JSON.stringify(focusState));
    clearInterval(focusTimer);
    focusTimer = null;
    renderFocus();
    document.getElementById('focus-message').textContent = 'You made it through a focus session. How are you feeling?';
    addMessage('assistant', 'That was a good stretch of focus. How are you feeling? A short break could help.');
    if (preferences.reminders && !preferences.quiet && Notification.permission === 'granted') {
      new Notification('ECHO', { body: 'Your focus session is complete. Take a moment to reset.' });
    }
  };

  const runFocusClock = () => {
    clearInterval(focusTimer);
    renderFocus();
    focusTimer = setInterval(() => {
      if (focusState.endsAt && Date.now() >= focusState.endsAt) {
        finishFocus();
        return;
      }
      renderFocus();
    }, 1000);
  };

  document.getElementById('focus-button').addEventListener('click', () => {
    const message = document.getElementById('focus-message');
    if (focusState.endsAt) {
      focusRemainingSeconds = Math.max(0, Math.ceil((focusState.endsAt - Date.now()) / 1000));
      focusState = { remainingSeconds: focusRemainingSeconds, endsAt: null };
      storage.setItem('echo.focus', JSON.stringify(focusState));
      clearInterval(focusTimer);
      focusTimer = null;
      message.textContent = 'Focus paused. Pick it up whenever you’re ready.';
      renderFocus();
      return;
    }
    if (focusRemainingSeconds <= 0) focusRemainingSeconds = 25 * 60;
    focusState = { remainingSeconds: focusRemainingSeconds, endsAt: Date.now() + focusRemainingSeconds * 1000 };
    storage.setItem('echo.focus', JSON.stringify(focusState));
    message.textContent = 'One thing at a time. I’ll be right here.';
    addMessage('assistant', 'Let’s make a little room for one thing. Your focus session has started.');
    runFocusClock();
  });

  const renderPreferences = () => {
    document.getElementById('api-url').value = preferences.apiBase || window.ECHO_API_BASE || '';
    document.getElementById('access-code').value = preferences.accessCode || '';
    document.getElementById('memory-toggle').checked = Boolean(preferences.rememberChat);
    document.getElementById('quiet-toggle').checked = Boolean(preferences.quiet);
    document.getElementById('reminder-state').textContent = preferences.reminders ? 'On' : 'Off';
    document.getElementById('reminders-button').textContent = preferences.reminders ? 'Turn reminders off' : 'Enable reminders';
  };

  document.getElementById('save-settings').addEventListener('click', () => {
    preferences.apiBase = document.getElementById('api-url').value.trim().replace(/\/+$/, '');
    preferences.accessCode = document.getElementById('access-code').value;
    preferences.rememberChat = document.getElementById('memory-toggle').checked;
    preferences.quiet = document.getElementById('quiet-toggle').checked;
    storage.setItem('echo.preferences', JSON.stringify(preferences));
    if (preferences.rememberChat) storage.setItem('echo.chat', JSON.stringify(conversation));
    else storage.removeItem('echo.chat');
    document.getElementById('settings-message').textContent = 'Saved on this device.';
    updateConnection();
  });

  document.getElementById('quiet-toggle').addEventListener('change', (event) => {
    preferences.quiet = event.target.checked;
    storage.setItem('echo.preferences', JSON.stringify(preferences));
  });

  document.getElementById('reminders-button').addEventListener('click', async () => {
    if (!('Notification' in window)) {
      document.getElementById('routine-message').textContent = 'Desktop notifications are not available in this browser.';
      return;
    }
    const permission = await Notification.requestPermission();
    if (permission !== 'granted') {
      document.getElementById('routine-message').textContent = 'Notifications remain off. You can change permission in browser settings.';
      return;
    }
    preferences.reminders = !preferences.reminders;
    storage.setItem('echo.preferences', JSON.stringify(preferences));
    renderPreferences();
    document.getElementById('routine-message').textContent = preferences.reminders
      ? 'I’ll nudge you about due priorities while this dashboard is open.'
      : 'Reminders paused.';
  });

  document.getElementById('chat-form').addEventListener('submit', async (event) => {
    event.preventDefault();
    const input = document.getElementById('chat-input');
    const content = input.value.trim();
    if (!content) return;
    const apiBase = preferences.apiBase || window.ECHO_API_BASE || '';
    addMessage('user', content);
    input.value = '';
    if (!apiBase) {
      addMessage('assistant', 'I’m here with you. Add the private AI service URL in Settings when it’s ready, and we can talk things through.');
      return;
    }

    const sendButton = document.getElementById('send-button');
    const status = document.getElementById('chat-status');
    sendButton.disabled = true;
    status.textContent = 'Echo is thinking...';
    try {
      const response = await fetch(`${apiBase}/api/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Echo-Access-Code': preferences.accessCode
        },
        body: JSON.stringify({ messages: conversation.slice(-20) })
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || `Chat request failed (${response.status}).`);
      addMessage('assistant', result.reply);
      status.textContent = '';
    } catch (error) {
      status.textContent = error.message || 'Could not reach the chat service. Check Settings and try again.';
    } finally {
      sendButton.disabled = false;
      input.focus();
    }
  });

  document.getElementById('clear-chat').addEventListener('click', () => {
    conversation = [];
    session.removeItem('echo.session-chat');
    storage.removeItem('echo.chat');
    renderChat();
    document.getElementById('chat-status').textContent = 'Conversation cleared from this device.';
  });

  window.addEventListener('storage', (event) => {
    if (event.key === 'echo.tasks') {
      tasks = readJson(storage, 'echo.tasks', []);
      renderTasks();
    } else if (event.key === 'echo.preferences') {
      Object.assign(preferences, readJson(storage, 'echo.preferences', {}));
      renderPreferences();
      updateConnection();
    } else if (event.key === 'echo.focus') {
      focusState = readJson(storage, 'echo.focus', defaultFocus);
      focusRemainingSeconds = focusState.endsAt
        ? Math.max(0, Math.ceil((focusState.endsAt - Date.now()) / 1000))
        : focusState.remainingSeconds;
      if (focusState.endsAt && !focusTimer) runFocusClock();
      if (!focusState.endsAt && focusTimer) {
        clearInterval(focusTimer);
        focusTimer = null;
      }
      renderFocus();
    } else if (event.key === 'echo.chat' && preferences.rememberChat) {
      conversation = readJson(storage, 'echo.chat', []);
      renderChat();
    }
  });

  renderTasks();
  renderChat();
  if (!conversation.length) {
    const hour = new Date().getHours();
    addMessage('assistant', `Hey, good ${hour < 12 ? 'morning' : hour < 18 ? 'afternoon' : 'evening'}. What would you like to talk through?`);
  }
  renderPreferences();
  renderFocus();
  updateConnection();
  if (focusState.endsAt && focusRemainingSeconds > 0) runFocusClock();

  setInterval(() => {
    if (!preferences.reminders || preferences.quiet || Notification.permission !== 'granted') return;
    const now = Date.now();
    const dueTask = tasks.find((task) =>
      !task.done && !task.reminded && task.dueAt && new Date(task.dueAt).getTime() <= now
    );
    if (!dueTask) return;
    dueTask.reminded = true;
    storage.setItem('echo.tasks', JSON.stringify(tasks));
    new Notification('A gentle nudge from Echo', { body: `Whenever you’re ready: ${dueTask.text}` });
  }, 30000);
})();
