/*
   Copyright (C) 2021 Archie Maclean
 */
import { replaceIndex } from '../global/utils';

import { StaveModel } from './model';
import { BarModel } from '../Bar/model';
import TimeSignature from '../TimeSignature/functions';

import { last } from '../global/utils';

import Bar from '../Bar/functions';

function bars(stave: StaveModel): BarModel[] {
  // Returns all the bars in the stave

  return stave.bars;
}

function addBar(stave: StaveModel, bar: BarModel, before: boolean): StaveModel {
  // Adds a new bar after the bar given

  const ind = stave.bars.indexOf(bar);
  if (ind !== -1)
    return {
      ...stave,
      bars: replaceIndex(
        before ? ind : ind + 1,
        0,
        stave.bars,
        Bar.init(bar.timeSignature)
      ),
    };
  return stave;
}
function addAnacrusis(
  stave: StaveModel,
  bar: BarModel,
  before: boolean
): StaveModel {
  // Adds a new anacrusis before the bar given

  const ind = stave.bars.indexOf(bar);
  if (ind !== -1)
    return {
      ...stave,
      bars: replaceIndex(
        before ? ind : ind + 1,
        0,
        stave.bars,
        Bar.initAnacrusis(bar.timeSignature)
      ),
    };
  return stave;
}
function deleteBar(stave: StaveModel, bar: BarModel): StaveModel {
  // Deletes the bar from the stave
  // Doesn't worry about purging the notes; that should be dealt with elsewhere

  const newStave = { ...stave };
  const ind = newStave.bars.indexOf(bar);
  if (ind !== -1) newStave.bars.splice(ind, 1);
  return newStave;
}

function lastBar(stave: StaveModel): BarModel | null {
  return last(stave.bars);
}

const init = (timeSignature = TimeSignature.init()): StaveModel => ({
  bars: [
    Bar.init(timeSignature),
    Bar.init(timeSignature),
    Bar.init(timeSignature),
    Bar.init(timeSignature),
  ],
});

export default {
  init,
  bars,
  addBar,
  addAnacrusis,
  deleteBar,
  lastBar,
};
