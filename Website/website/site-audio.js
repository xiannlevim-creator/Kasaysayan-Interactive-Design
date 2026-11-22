(() => {
  const musicPreferenceKey = "historyrunnn.audio.music";
  const allQuestsRewardKey = "historyrunnn.audio.all-quests-rewarded";
  const questIds = ["japan", "america", "spanish"];
  const AudioContextConstructor = window.AudioContext || window.webkitAudioContext;
  const pageName = decodeURIComponent(location.pathname.split("/").pop() || "").toLowerCase();
  const pageQuestId = (pageName.match(/^(japan|america|spanish) phase[123]\.html$/) || [])[1];

  const style = document.createElement("style");
  style.textContent = `
    .site-audio-toggle {
      position: fixed;
      right: 14px;
      bottom: 14px;
      z-index: 10000;
      min-height: 42px;
      padding: 9px 14px;
      color: #fff3d4;
      background: rgb(48 36 23 / 94%);
      border: 1px solid #cba66a;
      border-radius: 999px;
      box-shadow: 0 4px 12px rgb(22 16 8 / 38%);
      font: 600 0.82rem Georgia, "Times New Roman", serif;
      cursor: pointer;
    }

    .site-audio-toggle:hover:not(:disabled) {
      background: #55391d;
    }

    .site-audio-toggle:focus-visible {
      outline: 3px solid #f1d176;
      outline-offset: 3px;
    }

    .site-audio-toggle:disabled {
      cursor: not-allowed;
      opacity: 0.72;
    }

    .site-audio-status {
      position: absolute;
      width: 1px;
      height: 1px;
      overflow: hidden;
      clip: rect(0, 0, 0, 0);
      white-space: nowrap;
      clip-path: inset(50%);
    }

    @media (max-width: 600px) {
      .site-audio-toggle {
        right: 10px;
        bottom: 10px;
      }
    }
  `;
  document.head.append(style);

  const musicButton = document.createElement("button");
  musicButton.className = "site-audio-toggle";
  musicButton.type = "button";
  const musicLabel = document.createElement("span");
  const status = document.createElement("span");
  status.className = "site-audio-status";
  status.setAttribute("aria-live", "polite");
  musicButton.append(musicLabel, status);
  document.body.append(musicButton);

  if (!AudioContextConstructor) {
    musicButton.disabled = true;
    musicLabel.textContent = "Audio unavailable";
    status.textContent = "Audio is not supported in this browser.";
    musicButton.title = "Audio is not supported in this browser.";
    return;
  }

  let audioContext;
  let soundEffectsBus;
  let musicBus;
  let musicTimer;
  let musicEnabled = localStorage.getItem(musicPreferenceKey) === "on";
  let phraseIndex = 0;

  const updateMusicButton = () => {
    musicLabel.textContent = musicEnabled ? "♫ Background Music: On" : "♫ Background Music: Off";
    musicButton.setAttribute("aria-pressed", String(musicEnabled));
    musicButton.title = musicEnabled
      ? "Turn background music off"
      : "Turn background music on";
  };

  const ensureAudioContext = () => {
    if (!audioContext) {
      audioContext = new AudioContextConstructor();
      soundEffectsBus = audioContext.createGain();
      soundEffectsBus.gain.value = 0.72;
      soundEffectsBus.connect(audioContext.destination);
      musicBus = audioContext.createGain();
      musicBus.gain.value = 0.0001;
      musicBus.connect(audioContext.destination);
    }

    return audioContext.state === "suspended"
      ? audioContext.resume()
      : Promise.resolve();
  };

  const reportAudioError = (error) => {
    console.error("Could not start site audio.", error);
    status.textContent = "Audio could not start. Check your browser audio settings.";
  };

  const runAudio = (play) => {
    try {
      ensureAudioContext().then(play).catch(reportAudioError);
    } catch (error) {
      reportAudioError(error);
    }
  };

  const playTone = (frequency, start, duration, waveform, volume, output, slideTo) => {
    const oscillator = audioContext.createOscillator();
    const gain = audioContext.createGain();
    oscillator.type = waveform;
    oscillator.frequency.setValueAtTime(frequency, start);
    if (slideTo) oscillator.frequency.exponentialRampToValueAtTime(slideTo, start + duration);
    gain.gain.setValueAtTime(0.0001, start);
    gain.gain.exponentialRampToValueAtTime(volume, start + 0.025);
    gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);
    oscillator.connect(gain);
    gain.connect(output);
    oscillator.start(start);
    oscillator.stop(start + duration + 0.025);
  };

  const playClickSound = () => {
    const start = audioContext.currentTime + 0.005;
    playTone(740, start, 0.075, "sine", 0.052, soundEffectsBus);
    playTone(988, start + 0.035, 0.09, "sine", 0.035, soundEffectsBus);
  };

  const playPhaseReward = () => {
    const start = audioContext.currentTime + 0.005;
    [523.25, 659.25, 783.99].forEach((frequency, index) => {
      playTone(frequency, start + index * 0.13, 0.55, "sine", 0.07, soundEffectsBus);
    });
  };

  const playQuestReward = () => {
    const start = audioContext.currentTime + 0.005;
    [523.25, 659.25, 783.99, 1046.5, 1318.51].forEach((frequency, index) => {
      playTone(frequency, start + index * 0.15, 0.7, "triangle", 0.075, soundEffectsBus);
    });
    playTone(261.63, start, 0.85, "sine", 0.045, soundEffectsBus);
  };

  const musicProgression = [
    { chord: [130.81, 164.81, 196], melody: [392, 329.63, 261.63, 329.63] },
    { chord: [110, 146.83, 174.61], melody: [349.23, 293.66, 261.63, 293.66] },
    { chord: [87.31, 130.81, 174.61], melody: [329.63, 261.63, 220, 261.63] },
    { chord: [98, 146.83, 196], melody: [392, 329.63, 293.66, 329.63] }
  ];

  const scheduleMusicPhrase = () => {
    if (!musicEnabled || !audioContext || !musicBus) return;
    const phrase = musicProgression[phraseIndex % musicProgression.length];
    const start = audioContext.currentTime + 0.04;
    phrase.chord.forEach((frequency) => {
      playTone(frequency, start, 4, "sine", 0.105, musicBus);
    });
    phrase.melody.forEach((frequency, index) => {
      playTone(frequency, start + 0.35 + index * 0.78, 0.72, "triangle", 0.07, musicBus);
    });
    phraseIndex += 1;
  };

  const startMusic = () => {
    if (!musicEnabled || musicTimer) return;
    const now = audioContext.currentTime;
    musicBus.gain.cancelScheduledValues(now);
    musicBus.gain.setTargetAtTime(0.16, now, 0.35);
    scheduleMusicPhrase();
    musicTimer = window.setInterval(scheduleMusicPhrase, 3900);
  };

  const stopMusic = () => {
    if (musicTimer) {
      window.clearInterval(musicTimer);
      musicTimer = undefined;
    }
    if (audioContext && musicBus) {
      const now = audioContext.currentTime;
      musicBus.gain.cancelScheduledValues(now);
      musicBus.gain.setTargetAtTime(0.0001, now, 0.12);
    }
  };

  const allQuestsFinished = () => questIds.every((questId) =>
    localStorage.getItem(`historyrunnn.quest.${questId}`) === "finished"
  );

  const handleButtonClick = (event) => {
    if (!(event.target instanceof Element)) return;
    const control = event.target.closest("button, a[href], input[type='button'], input[type='submit']");
    if (!control) return;

    if (control.matches(".complete-phase") && control instanceof HTMLButtonElement && control.disabled) {
      if (allQuestsFinished()) {
        if (localStorage.getItem(allQuestsRewardKey) !== "played") {
          localStorage.setItem(allQuestsRewardKey, "played");
          runAudio(playQuestReward);
        } else {
          runAudio(playPhaseReward);
        }
      } else if (pageQuestId && localStorage.getItem(`historyrunnn.quest.${pageQuestId}`) === "finished") {
        runAudio(playQuestReward);
      } else {
        runAudio(playPhaseReward);
      }
      return;
    }

    if (control instanceof HTMLButtonElement && control.disabled) return;

    runAudio(playClickSound);

    if (control.matches(".reset-progress, .reset-button") && !allQuestsFinished()) {
      localStorage.removeItem(allQuestsRewardKey);
    }
  };

  musicButton.addEventListener("click", () => {
    musicEnabled = !musicEnabled;
    localStorage.setItem(musicPreferenceKey, musicEnabled ? "on" : "off");
    updateMusicButton();
    if (musicEnabled) {
      runAudio(startMusic);
    } else {
      stopMusic();
    }
  });

  updateMusicButton();
  document.addEventListener("click", handleButtonClick);

  if (musicEnabled) {
    runAudio(startMusic);
  }
})();
