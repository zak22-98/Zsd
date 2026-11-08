"""Génère la nappe sonore de l'intro : souffles, nappe grave, aucune mélodie.
Usage : python3 tools/make_audio.py public/audio/nappe.wav"""
import sys, wave
import numpy as np

SR = 48000
DUR = 78.0
N = int(SR * DUR)
t = np.arange(N) / SR
rng = np.random.default_rng(7)

def env(a, b, fin, fout):
    e = np.clip((t - a) / fin, 0, 1) * np.clip((b - t) / fout, 0, 1)
    return e * e * (3 - 2 * e)

def lowpass(x, fc):
    """Passe-bas à un pôle appliqué deux fois (pente 12 dB/oct)."""
    from itertools import accumulate
    a = np.exp(-2 * np.pi * fc / SR)
    for _ in range(2):
        x = np.fromiter(accumulate(x, lambda s, v: a * s + (1 - a) * v), dtype=np.float64, count=len(x))
    return x

def bandnoise(lo, hi, n):
    w = rng.standard_normal(n)
    return lowpass(w, hi) - lowpass(w, lo)

L = np.zeros(N); R = np.zeros(N)

# 1. Souffles (inspiration puis expiration lente)
for a, b, amp in [(0.7, 2.5, 0.16), (2.7, 5.2, 0.13)]:
    i0, i1 = int(a * SR), int(b * SR)
    n = i1 - i0
    br = bandnoise(250, 1400, n)
    x = np.linspace(0, 1, n)
    shape = np.sin(np.pi * x) ** 1.6 * (1 - 0.3 * x)
    L[i0:i1] += br * shape * amp
    R[i0:i1] += br * shape * amp * 0.9

# 2. Nappe grave : sol1 + ré2, légère pulsation, jamais mélodique
drone_env = env(4.0, 63.6, 6.0, 1.2) * (0.55 + 0.45 * env(29, 62.5, 8, 2)) + 0.35 * env(63.0, 72.0, 0.6, 1.5)
for f, a, ph in [(49.0, 0.22, 0.0), (49.35, 0.16, 1.3), (73.4, 0.09, 0.7), (98.0, 0.035, 2.1)]:
    lfo = 1 + 0.25 * np.sin(2 * np.pi * 0.06 * t + ph)
    L += a * lfo * np.sin(2 * np.pi * f * t + ph) * drone_env
    R += a * lfo * np.sin(2 * np.pi * f * 1.0015 * t + ph + 0.4) * drone_env
rumble = bandnoise(25, 140, N)
L += rumble * 0.5 * drone_env
R += np.roll(rumble, 900) * 0.5 * drone_env

# 3. Vent de cendre (passage, table)
wind = bandnoise(300, 2400, N) * 0.05 * env(25.5, 50, 4, 5)
wind *= 1 + 0.6 * np.sin(2 * np.pi * 0.11 * t)
L += wind; R += np.roll(wind, 2400)

# 4. Extinction de chaque braise : souffle court et sourd
for i in range(4):
    s = 7 + i * 4.5 + 2.75
    i0 = int(s * SR); n = int(1.3 * SR)
    puff = bandnoise(120, 900, n) * np.exp(-np.linspace(0, 5, n)) * np.minimum(1, np.linspace(0, 12, n)) * 0.22
    L[i0:i0 + n] += puff; R[i0:i0 + n] += puff * 0.85

# 5. Embrasement de la ligne / soulèvement du relief : grondement qui monte
rise = bandnoise(20, 90, N) * 1.1 * env(43, 49.5, 2.5, 2.5)
L += rise; R += rise

# 6. Crépitement de braise (ligne, chaise, titre)
crack_env = 0.6 * env(43, 47.5, 0.3, 2) + 0.35 * env(51, 62.5, 1, 1.5) + 0.7 * env(73, 78, 0.4, 1.2)
clicks = (rng.random(N) < 0.0009).astype(float) * rng.standard_normal(N)
cr = lowpass(clicks, 3500) * 2.2 * crack_env
L += cr; R += np.roll(cr, 300)

# 7. Titre : un seul coup sourd, très bas
i0 = int(73.0 * SR); n = int(4 * SR)
tt = np.arange(n) / SR
boom = np.sin(2 * np.pi * (38 * tt + 4 * (1 - np.exp(-tt * 3)))) * np.exp(-tt * 1.1) * np.minimum(1, tt * 40) * 0.42
L[i0:i0 + n] += boom; R[i0:i0 + n] += boom
tail = env(73.2, 78, 1.5, 1.6)
for f, a in [(49.0, 0.14), (73.4, 0.05)]:
    L += a * np.sin(2 * np.pi * f * t) * tail
    R += a * np.sin(2 * np.pi * f * 1.002 * t) * tail

# fondu final et normalisation (crête -3 dBFS)
fade = np.clip((78 - t) / 0.6, 0, 1)
L *= fade; R *= fade
peak = max(np.abs(L).max(), np.abs(R).max())
g = 10 ** (-3 / 20) / peak
st = np.stack([L * g, R * g], axis=1)
pcm = (np.clip(st, -1, 1) * 32767).astype("<i2")
with wave.open(sys.argv[1], "wb") as w:
    w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR)
    w.writeframes(pcm.tobytes())
print("ok", sys.argv[1])
