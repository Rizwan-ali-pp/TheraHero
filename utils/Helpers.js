class Helpers {
  static formatTime(milliseconds) {
    return (milliseconds / 1000).toFixed(2);
  }

  static calculateAccuracy(score, max) {
    return max > 0 ? Math.round((score / max) * 100) : 0;
  }
}
