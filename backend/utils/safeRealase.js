function safeRelease(conn) {
    if (!conn) return;
    try {
      if (typeof conn.release === 'function') return conn.release();
      if (typeof conn.close === 'function') return conn.close();
      if (typeof conn.end === 'function') return conn.end();
    } catch (e) {
      console.warn('safeRelease: erro ao liberar conexão:', e);
    }
  }

module.exports={
    safeRelease
}