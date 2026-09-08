// ============================================
// CRYPTOX - PRICE ALERTS SYSTEM
// ============================================

class PriceAlerts {
  constructor() {
    this._key = 'cx_price_alerts';
    this._checkInterval = null;
    this._notifPermission = false;
    this._requestNotifPermission();
  }

  _requestNotifPermission() {
    if ('Notification' in window) {
      if (Notification.permission === 'granted') {
        this._notifPermission = true;
      } else if (Notification.permission !== 'denied') {
        Notification.requestPermission().then(perm => {
          this._notifPermission = (perm === 'granted');
        });
      }
    }
  }

  getAlerts() {
    try {
      return JSON.parse(localStorage.getItem(this._key) || '[]');
    } catch(e) { return []; }
  }

  _saveAlerts(alerts) {
    localStorage.setItem(this._key, JSON.stringify(alerts));
  }

  addAlert(coin, targetPrice, direction, note) {
    const alerts = this.getAlerts();
    const alert = {
      id: 'alert_' + Date.now() + '_' + Math.random().toString(36).slice(2,6),
      coin: coin,
      targetPrice: parseFloat(targetPrice),
      direction: direction, // 'above' or 'below'
      note: note || '',
      createdAt: Date.now(),
      triggered: false
    };
    alerts.push(alert);
    this._saveAlerts(alerts);
    return alert;
  }

  removeAlert(id) {
    const alerts = this.getAlerts().filter(a => a.id !== id);
    this._saveAlerts(alerts);
  }

  checkAlerts() {
    const alerts = this.getAlerts();
    let changed = false;

    alerts.forEach(alert => {
      if (alert.triggered) return;
      const coin = (typeof COINS !== 'undefined') ? COINS.find(c => c.id === alert.coin) : null;
      if (!coin) return;

      const currentPrice = coin.price;
      let triggered = false;

      if (alert.direction === 'above' && currentPrice >= alert.targetPrice) triggered = true;
      if (alert.direction === 'below' && currentPrice <= alert.targetPrice) triggered = true;

      if (triggered) {
        alert.triggered = true;
        alert.triggeredAt = Date.now();
        alert.triggeredPrice = currentPrice;
        changed = true;
        this._fireNotification(alert, currentPrice);
      }
    });

    if (changed) {
      this._saveAlerts(alerts);
      if (typeof renderAlertsList === 'function') renderAlertsList();
    }
  }

  _fireNotification(alert, price) {
    const fmtPrice = price >= 1 ? '$' + price.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '$' + price.toFixed(6);
    const body = `${alert.coin} reached ${fmtPrice}! (Target: ${alert.direction} $${alert.targetPrice.toLocaleString()})${alert.note ? '\n' + alert.note : ''}`;

    // Try ServiceWorker push notification first
    if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
      navigator.serviceWorker.controller.postMessage({
        type: 'PRICE_ALERT',
        title: `Price Alert: ${alert.coin}`,
        body: body,
        icon: '/icons/icon-192.png'
      });
      return;
    }

    // Fallback to Notification API
    if (this._notifPermission && 'Notification' in window && Notification.permission === 'granted') {
      try {
        new Notification(`Price Alert: ${alert.coin}`, {
          body: body,
          icon: '/icons/icon-192.png',
          badge: '/icons/icon-192.png',
          tag: alert.id
        });
      } catch(e) {
        console.warn('[Alerts] Notification failed:', e);
      }
    }

    // Also show toast
    if (typeof showToast === 'function') {
      showToast(`${alert.coin} alert triggered! ${fmtPrice}`, 't-success');
    }
  }

  startChecking(intervalMs) {
    if (this._checkInterval) clearInterval(this._checkInterval);
    this._checkInterval = setInterval(() => this.checkAlerts(), intervalMs || 5000);
  }

  stopChecking() {
    if (this._checkInterval) {
      clearInterval(this._checkInterval);
      this._checkInterval = null;
    }
  }

  getStats() {
    const all = this.getAlerts();
    return {
      total: all.length,
      active: all.filter(a => !a.triggered).length,
      triggered: all.filter(a => a.triggered).length
    };
  }
}

// Global instance
const priceAlerts = new PriceAlerts();
