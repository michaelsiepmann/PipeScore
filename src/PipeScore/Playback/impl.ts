//  PipeScore - online bagpipe notation
//  Copyright (C) macarc
//
//  This program is free software: you can redistribute it and/or modify
//  it under the terms of the GNU General Public License as published by
//  the Free Software Foundation, either version 3 of the License, or
//  (at your option) any later version.
//
//  This program is distributed in the hope that it will be useful,
//  but WITHOUT ANY WARRANTY; without even the implied warranty of
//  MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
//  GNU General Public License for more details.
//
//  You should have received a copy of the GNU General Public License
//  along with this program.  If not, see <https://www.gnu.org/licenses/>.

//  Playback - given a list of pitches and lengths, play them using the
//  Web Audio API:
//  <https://developer.mozilla.org/en-US/docs/Web/API/Web_Audio_API>

import {
  type Playback,
  PlaybackGracenote,
  PlaybackNote,
  PlaybackObject,
  PlaybackRepeat,
  type PlaybackSecondTiming,
} from '.';
import { dispatch } from '../Controller';
import { updateView } from '../Events/Misc';
import { updatePlaybackCursor } from '../Events/Playback';
import type { ID } from '../global/id';
import { Pitch } from '../global/pitch';
import { settings } from '../global/settings';
import { sleep } from '../global/utils';
import { Player, Sample } from './sample';
import type { PlaybackState } from './state';

class Drones {
  private player: Player;
  private stopped = false;

  constructor(sample: Sample, context: AudioContext) {
    this.player = new Player(sample, context);
  }
  async play() {
    while (!this.stopped) {
      this.player.play(0.1);
      const sleepLength = this.player.length() - 3;
      await sleep(1000 * sleepLength);
    }
  }
  stop() {
    this.player.stop();
    this.stopped = true;
  }
}

class SoundedPitch {
  sample: AudioBufferSourceNode;
  gain: GainNode;
  pitch: Pitch;
  duration: number;
  id: ID | null;

  constructor(pitch: Pitch, duration: number, ctx: AudioContext, id: ID | null) {
    this.sample = pitchToSample(pitch).getSource(ctx);
    this.gain = ctx.createGain();
    this.sample.connect(this.gain);
    this.gain.connect(ctx.destination);
    this.pitch = pitch;
    this.duration = duration;
    this.id = id;
  }

  async play(bpm: number, isMainTune: boolean) {
    if (isMainTune) {
      dispatch(updatePlaybackCursor(this.id));
      this.gain.gain.setValueAtTime(1, 0);
    } else {
      this.gain.gain.setValueAtTime(settings.harmonyVolume, 0);
    }

    const duration = (1000 * this.duration * 60) / bpm;
    this.sample.start(0);
    await sleep(duration);
    this.sample.stop();
  }
}

const lowg = new Sample('lowg');
const lowa = new Sample('lowa');
const b = new Sample('b');
const c = new Sample('c');
const d = new Sample('d');
const e = new Sample('e');
const f = new Sample('f');
const highg = new Sample('highg');
const higha = new Sample('higha');
const drones = new Sample('drones');

// This is in a function so that sample loading can be delayed, so that images
// are loaded first. Hackity hackity.
export async function startLoadingSamples(onload: () => void) {
  const context = new AudioContext();
  const samples = await Promise.all([
    lowg.load(),
    lowa.load(),
    b.load(),
    c.load(),
    d.load(),
    e.load(),
    f.load(),
    highg.load(),
    higha.load(),
    drones.load(),
  ]);
  for (const fn of samples) {
    fn(context);
  }
  onload();
}

function pitchToSample(pitch: Pitch): Sample {
  switch (pitch) {
    case Pitch.G:
      return lowg;
    case Pitch.A:
      return lowa;
    case Pitch.B:
      return b;
    case Pitch.C:
      return c;
    case Pitch.D:
      return d;
    case Pitch.E:
      return e;
    case Pitch.F:
      return f;
    case Pitch.HG:
      return highg;
    case Pitch.HA:
      return higha;
  }
}

function shouldDeleteBecauseOfSecondTimings(
  index: number,
  timings: PlaybackSecondTiming[],
  repeating: boolean
) {
  return timings.some((t) => t.shouldDeleteElement(index, repeating));
}

function inSecondTiming(index: number, timings: PlaybackSecondTiming[]) {
  return timings.some((t) => t.in(index));
}

// Removes all PlaybackRepeats and PlaybackObjects from `elements'
// and duplicates notes where necessary for repeats / second timings
function expandRepeats(
  elements: Playback[],
  timings: PlaybackSecondTiming[],
  start: ID | null,
  end: ID | null
): (PlaybackNote | PlaybackGracenote | PlaybackObject)[] {
  let started = false;
  let repeatStartIndex = 0;
  let repeatEndIndex = 0;
  let repeating = false;
  let timingOverRepeat: PlaybackSecondTiming | null = null;
  let output: (PlaybackNote | PlaybackGracenote | PlaybackObject)[] = [];

  for (let i = 0; i < elements.length; i++) {
    const e = elements[i];
    if (e instanceof PlaybackRepeat) {
      if (e.type === 'repeat-end' && repeating && !inSecondTiming(i, timings)) {
        repeating = false;
        repeatStartIndex = i;
      } else if (e.type === 'repeat-end' && i > repeatEndIndex) {
        timingOverRepeat = timings.find((t) => t.in(i)) || null;
        repeatEndIndex = i;
        // Go back to repeat
        i = repeatStartIndex;
        // Need to do this to avoid an infinite loop
        // if two end repeats are next to each other
        repeatStartIndex = i;
        repeating = true;
      } else if (e.type === 'repeat-start') {
        repeatStartIndex = i;
      }
    } else if (e instanceof PlaybackObject) {
      if (e.type === 'object-start' && e.id === start && !started) {
        output = [];
        started = true;
      }
      if (e.type === 'object-end') {
        if (e.id === end) {
          return output;
        }
        if (repeating) {
          if (timingOverRepeat) {
            // Only stop repeating when the timing that went over the repeat
            // mark is done (allowing other second timings to be present earlier
            // in a part)
            if (i === timingOverRepeat.end) {
              repeating = false;
            }
          }
        }
      }

      if (!shouldDeleteBecauseOfSecondTimings(i, timings, repeating)) {
        output.push(e);
      }
    } else {
      if (!shouldDeleteBecauseOfSecondTimings(i, timings, repeating)) {
        output.push(e);
      }
    }
  }
  return output;
}

// Collapses all adjacent notes with the same pitch to one note (with duration of both notes)
// This fixes playback of tied notes
function collapsePitches(pitches: SoundedPitch[]): SoundedPitch[] {
  const collapsed: SoundedPitch[] = [];
  let lastPitch: Pitch | null = null;

  for (const pitch of pitches) {
    if (pitch.pitch === lastPitch) {
      collapsed[collapsed.length - 1].duration += pitch.duration;
    } else {
      collapsed.push(pitch);
    }
    lastPitch = pitch.pitch;
  }

  return collapsed;
}

function getSoundedPitches(
  elements: Playback[],
  timings: PlaybackSecondTiming[],
  ctx: AudioContext,
  start: ID | null,
  end: ID | null
): SoundedPitch[] {
  const elementsToPlay = expandRepeats(elements, timings, start, end);

  const gracenoteDuration = 0.044;

  const pitches: SoundedPitch[] = [];

  let currentID: ID | null = null;

  let currentGracenoteDuration = 0;

  for (let i = 0; i < elementsToPlay.length; i++) {
    const e = elementsToPlay[i];
    if (e instanceof PlaybackGracenote) {
      pitches.push(new SoundedPitch(e.pitch, gracenoteDuration, ctx, currentID));
      currentGracenoteDuration += gracenoteDuration;
    } else if (e instanceof PlaybackNote) {
      let duration = e.duration - currentGracenoteDuration;
      currentGracenoteDuration = 0;
      // If subsequent notes are tied, increase this note's duration
      // and skip the next notes
      for (
        let nextNote = elementsToPlay[i + 1];
        i < elementsToPlay.length &&
        nextNote instanceof PlaybackNote &&
        nextNote.tied;
        nextNote = elementsToPlay[++i + 1]
      ) {
        duration += nextNote.duration;
      }
      pitches.push(new SoundedPitch(e.pitch, duration, ctx, currentID));
    } else if (e instanceof PlaybackObject) {
      currentID = e.id;
    } else {
      console.log(e);
      throw new Error(`Unexpected playback element ${e}`);
    }
  }
  return collapsePitches(pitches);
}

export async function playback(
  state: PlaybackState,
  elements: Playback[][],
  timings: PlaybackSecondTiming[],
  start: ID | null = null,
  end: ID | null = null,
  loop = false
): Promise<void> {
  if (state.playing || state.loading) return;

  const context = new AudioContext();

  state.playing = true;

  // Due to browser restrictions, await may not be used
  // until after sound has already been played

  document.body.classList.add('loading');

  const drone = new Drones(drones, context);

  drone.play();
  await sleep(1000);
  document.body.classList.remove('loading');

  await play(state, elements, timings, context, start, end, loop);

  drone.stop();

  state.playing = false;
}

async function play(
  state: PlaybackState,
  elements: Playback[][],
  timings: PlaybackSecondTiming[],
  context: AudioContext,
  start: ID | null,
  end: ID | null,
  loop: boolean
) {
  await Promise.all(
    elements.map(async (elements, i) => {
      outer: for (;;) {
        const pitches = getSoundedPitches(elements, timings, context, start, end);
        for (const note of pitches) {
          if (state.userPressedStop) break outer;

          await note.play(settings.bpm, i === 0);
        }

        if (!loop) {
          break;
        }
      }
    })
  );

  state.userPressedStop = false;
  dispatch(updateView());
}
