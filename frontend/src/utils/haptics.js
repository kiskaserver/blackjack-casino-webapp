export const haptics = {
  impact(level = 'light') {
    try {
      const tg = window.Telegram?.WebApp;
      if (tg?.HapticFeedback?.impactOccurred) {
        tg.HapticFeedback.impactOccurred(level);
        return;
      }
    } catch {}
    // Fallback to short vibration on supported devices
    if (navigator.vibrate) {
      if (level === 'heavy') navigator.vibrate([20, 30, 20]);
      else if (level === 'medium') navigator.vibrate(25);
      else navigator.vibrate(15);
    }
  },
  notify(type = 'success') {
    try {
      const tg = window.Telegram?.WebApp;
      if (tg?.HapticFeedback?.notificationOccurred) {
        tg.HapticFeedback.notificationOccurred(type);
        return;
      }
    } catch {}
    if (navigator.vibrate) {
      if (type === 'error') navigator.vibrate([50, 40, 50]);
      else if (type === 'warning') navigator.vibrate([40, 30, 40]);
      else navigator.vibrate([30, 20, 30]);
    }
  },
  selection() {
    try {
      const tg = window.Telegram?.WebApp;
      if (tg?.HapticFeedback?.selectionChanged) tg.HapticFeedback.selectionChanged();
    } catch {}
  }
};
