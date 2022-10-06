/*
  Score format
  Copyright (C) 2021 macarc
*/
import { Stave, trebleClefWidth } from '../Stave';
import { TextBox } from '../TextBox';
import { BaseTiming, Timing, TimingPart } from '../SecondTiming';
import { TimeSignature } from '../TimeSignature';
import { settings } from '../global/settings';
import m from 'mithril';
import { clickBackground, mouseOffPitch, mouseUp } from '../Events/Mouse';
import { Demo } from '../DemoNote';
import { NoteState } from '../Note/state';
import { Update } from '../Events/common';
import { ScoreSelection, Selection } from '../Selection';
import { GracenoteState } from '../Gracenote/state';
import { first, foreach, last, nlast, Obj } from '../global/utils';

import { Triplet } from '../Note';
import { ID, Item } from '../global/id';
import { Bar } from '../Bar';
import { setXYPage } from '../global/xy';
import { dispatch } from '../Controller';

interface ScoreProps {
  selection: Selection | null;
  justAddedNote: boolean;
  noteState: NoteState;
  demoNote: Demo | null;
  gracenoteState: GracenoteState;
}
export class Score {
  private name: string;
  public landscape: boolean;
  private _staves: Stave[];
  // an array rather than a set since it makes rendering easier (with map)
  private textBoxes: TextBox[][];
  private secondTimings: Timing[];

  public showNumberOfPages: boolean;
  public numberOfPages = 1;
  public zoom: number;

  constructor(
    name = 'My Tune',
    composer = '',
    tuneType = '',
    numberOfParts = 2,
    repeatParts = true,
    timeSignature: TimeSignature | undefined = undefined
  ) {
    this.name = name;
    this.landscape = true;
    this.showNumberOfPages = true;
    this._staves = foreach(2 * numberOfParts, () => new Stave(timeSignature));
    const first = repeatParts ? 'repeatFirst' : 'partFirst';
    const last = repeatParts ? 'repeatLast' : 'partLast';
    this._staves.forEach((stave, index) =>
      index % 2 === 0 ? stave[first]() : stave[last]()
    );
    this.textBoxes = [
      [new TextBox(name, true, this.width() / 2, settings.topOffset / 2)],
    ];

    // Detailed text - composer / tuneType
    const detailTextSize = 15;
    const detailY = Math.max(settings.topOffset - 45, 10);
    const detailX = 8;
    if (composer.length > 0)
      this.textBoxes[0].push(
        new TextBox(
          composer,
          false,
          ((detailX - 1) * this.width()) / detailX,
          detailY,
          detailTextSize
        )
      );
    if (tuneType.length > 0)
      this.textBoxes[0].push(
        new TextBox(
          tuneType,
          false,
          this.width() / detailX,
          detailY,
          detailTextSize
        )
      );

    this.secondTimings = [];
    this.zoom = (100 * 0.9 * Math.max(window.innerWidth, 800)) / this.width();
  }
  public static fromJSON(o: Obj) {
    const s = new Score(o.name);
    s.landscape = o.landscape;
    s._staves = o._staves.map(Stave.fromJSON);
    s.textBoxes = o.textBoxes.map((p: Obj) => p.texts.map(TextBox.fromJSON));
    s.secondTimings = o.secondTimings.map(BaseTiming.fromJSON);
    s.numberOfPages = o.numberOfPages;
    s.showNumberOfPages = o.showNumberOfPages;
    settings.fromJSON(o.settings);
    return s;
  }
  public toJSON() {
    return {
      name: this.name,
      landscape: this.landscape,
      showNumberOfPages: this.showNumberOfPages,
      _staves: this._staves.map((stave) => stave.toJSON()),
      textBoxes: this.textBoxes.map((p) => ({
        texts: p.map((txt) => txt.toJSON()),
      })),
      secondTimings: this.secondTimings.map((st) => st.toJSON()),
      numberOfPages: this.numberOfPages,
      settings: settings.toJSON(),
    };
  }
  public width() {
    return this.landscape ? 297 * 5 : 210 * 5;
  }
  public height() {
    return this.landscape ? 210 * 5 : 297 * 5;
  }
  public orientation() {
    return this.landscape ? 'landscape' : 'portrait';
  }
  public makeLandscape() {
    if (this.landscape) return Update.NoChange;
    this.landscape = true;
    this.adjustAfterOrientationChange();
    return Update.ShouldSave;
  }
  public makePortrait() {
    if (!this.landscape) return Update.NoChange;
    this.landscape = false;
    this.adjustAfterOrientationChange();
    return Update.ShouldSave;
  }
  private adjustAfterOrientationChange() {
    while (this.notEnoughSpace(this.numberOfPages - 1)) {
      this.numberOfPages += 1;
    }
    this.textBoxes.forEach((p) =>
      p.forEach((text) =>
        text.adjustAfterOrientation(this.width(), this.height())
      )
    );
    this.bars().forEach((b) => b.adjustWidth(this.width() / this.height()));
    this.zoom = (this.zoom * this.height()) / this.width();
  }
  public updateName() {
    this.textBoxes[0][0] && (this.name = this.textBoxes[0][0].text());
  }
  public addText(text: TextBox) {
    this.textBoxes[0].push(text);
  }
  public addSecondTiming(secondTiming: Timing) {
    if (secondTiming.isValid(this.secondTimings)) {
      this.secondTimings.push(secondTiming);
      return true;
    }
    return false;
  }
  private staveY(stave: Stave, pageIndex: number) {
    return (
      this.topGap(pageIndex) + settings.staveGap * this._staves.indexOf(stave)
    );
  }
  private topGap(pageIndex: number) {
    return pageIndex === 0 ? settings.topOffset : settings.margin;
  }
  private stavesSplitByPage() {
    const splitStaves: Stave[][] = foreach(this.numberOfPages, () => []);
    let i = 0;
    for (const stave of this._staves) {
      i = Math.floor(
        (settings.topOffset + settings.staveGap * this._staves.indexOf(stave)) /
          (this.height() - settings.margin)
      );
      splitStaves[Math.min(i, this.numberOfPages - 1)].push(stave);
    }
    return splitStaves;
  }
  private notEnoughSpace(page: number) {
    return (
      this.topGap(page) +
        settings.staveGap * this.stavesSplitByPage()[page].length >
      this.height() - settings.margin
    );
  }
  public addStave(nearStave: Stave | null, before: boolean) {
    const usefulHeightPerPage = this.height() - 2 * settings.margin;
    // First page is different since it has a gap at the top (of size topOffset)
    const usefulHeightOnFirstPage =
      this.height() - settings.margin - settings.topOffset;
    const gapNeededBetweenStaves =
      (usefulHeightOnFirstPage +
        usefulHeightPerPage * (this.numberOfPages - 1)) /
      (this._staves.length + 0.5);

    if (gapNeededBetweenStaves < Stave.minHeight()) {
      alert(
        'Cannot add stave - not enough space. Add another page, or reduce the margin at the top of the page.'
      );
      return;
    } else if (gapNeededBetweenStaves < settings.staveGap) {
      settings.staveGap = gapNeededBetweenStaves;
    }

    if (nearStave) {
      const adjacentBar = before ? nearStave.firstBar() : nearStave.lastBar();
      const ts = adjacentBar && adjacentBar.timeSignature();
      const ind = this._staves.indexOf(nearStave);
      const newStave = new Stave(ts || new TimeSignature());
      if (ind !== -1) this._staves.splice(before ? ind : ind + 1, 0, newStave);
    } else {
      this._staves.push(new Stave(new TimeSignature()));
    }
  }

  public nextBar(id: ID) {
    return Bar.nextBar(id, this.bars());
  }
  public previousBar(id: ID) {
    return Bar.previousBar(id, this.bars());
  }
  public nextNote(id: ID) {
    return Bar.nextNote(id, this.bars());
  }
  public previousNote(id: ID) {
    return Bar.previousNote(id, this.bars());
  }
  public hasStuffOnLastPage() {
    return nlast(this.stavesSplitByPage()).length > 0;
  }
  public firstOnPage(page: number) {
    return first(this.stavesSplitByPage()[page])?.firstBar() || null;
  }
  public lastOnPage(page: number) {
    return last(this.stavesSplitByPage()[page])?.lastBar() || null;
  }
  public deletePage() {
    const stavesToDelete = this.stavesSplitByPage()[this.numberOfPages - 1];
    if (stavesToDelete) {
      const first = stavesToDelete[0]?.firstBar() || null;
      const last = nlast(stavesToDelete)?.lastBar() || null;
      if (first && last) {
        const selection = new ScoreSelection(first.id, last.id);
        selection.delete(this);
      }
    }

    this.textBoxes[this.numberOfPages - 1] = [];
    this.numberOfPages--;
  }
  // Deletes the stave from the score
  // Does not worry about purging notes/bars; that should be handled elsewhere
  public deleteStave(stave: Stave) {
    const ind = this._staves.indexOf(stave);
    if (ind !== -1) this._staves.splice(ind, 1);
  }
  public notesAndTriplets() {
    return this.bars().flatMap((bar) => bar.notesAndTriplets());
  }
  public notes() {
    return Triplet.flatten(this.notesAndTriplets());
  }
  public bars() {
    return this._staves.flatMap((stave) => stave.bars());
  }
  public staves() {
    return this._staves;
  }
  public lastStave() {
    return last(this._staves);
  }

  // Finds the parent bar and stave of the bar/note passed
  public location(id: ID) {
    const staves = this.staves();

    if (staves.length === 0)
      throw Error('Tried to get location of a note, but there are no staves!');

    for (const stave of staves) {
      for (const bar of stave.bars()) {
        if (bar.hasID(id) || bar.includesNote(id)) {
          return { stave, bar };
        }
      }
    }

    const lastStave = nlast(staves);
    const lastBar = nlast(lastStave.bars());
    return {
      stave: lastStave,
      bar: lastBar,
    };
  }

  // Converts the y coordinate to the index of stave that the y coordinate lies within
  // If it is below 0, it returns 0; if it doesn't lie on any stave it returns null
  public coordinateToStaveIndex(y: number): number | null {
    const offset = y + 4 * settings.lineGap - settings.topOffset;
    if (offset > 0 && offset % settings.staveGap <= 12 * settings.lineGap) {
      return Math.max(Math.floor(offset / settings.staveGap), 0);
    } else {
      return null;
    }
  }
  public deleteSecondTiming(secondTiming: Timing) {
    this.secondTimings.splice(this.secondTimings.indexOf(secondTiming), 1);
  }
  public deleteTextBox(text: TextBox) {
    for (const p of this.textBoxes) {
      const i = p.indexOf(text);
      if (i > -1) p.splice(i, 1);
    }
  }
  public dragTextBox(text: TextBox, x: number, y: number, page: number) {
    if (page >= this.numberOfPages) return;
    // TODO can I remove this first check?
    if (this.textBoxes[page] || !this.textBoxes[page].includes(text)) {
      for (const page of this.textBoxes) {
        if (page.includes(text)) {
          page.splice(page.indexOf(text), 1);
        }
      }
      if (!this.textBoxes[page]) this.textBoxes[page] = [];
      this.textBoxes[page].push(text);
    }
    if (x < this.width() && x > 0 && y < this.height() && y > 0) {
      text.setCoords(x, y);
    }
  }
  public dragSecondTiming(
    secondTiming: Timing,
    part: TimingPart,
    x: number,
    y: number,
    page: number
  ) {
    secondTiming.drag(part, x, y, page, this.secondTimings);
  }

  public purgeSecondTimings(items: Item[]) {
    const secondTimingsToDelete: Timing[] = [];
    for (const item of items) {
      for (const st of this.secondTimings) {
        if (st.pointsTo(item.id)) secondTimingsToDelete.push(st);
      }
    }
    secondTimingsToDelete.forEach((t) => this.deleteSecondTiming(t));
  }
  public play() {
    return this._staves.flatMap((st, i) =>
      st.play(i === 0 ? null : this._staves[i - 1])
    );
  }
  public render(props: ScoreProps): m.Children {
    const width = this.width();
    const height = this.height();

    const staveProps = (stave: Stave, index: number, pageIndex: number) => ({
      x: settings.margin,
      y: index * settings.staveGap + this.topGap(pageIndex),
      justAddedNote: props.justAddedNote,
      width: width - 2 * settings.margin,
      previousStave: this._staves[index - 1] || null,
      previousStaveY: this.staveY(stave, pageIndex),
      noteState: props.noteState,
      gracenoteState: props.gracenoteState,
    });

    const secondTimingProps = (page: number) => ({
      page,
      score: this,
      staveStartX: settings.margin + trebleClefWidth,
      staveEndX: width - settings.margin,
      selection: props.selection,
      staveGap: settings.staveGap,
    });
    const selectionProps = (i: number) => ({
      page: i,
      score: this,
      staveStartX: settings.margin,
      staveEndX: width - settings.margin,
      staveGap: settings.staveGap,
    });

    const splitStaves = this.stavesSplitByPage();
    const texts = (i: number) => this.textBoxes[i] || [];

    return m(
      'div',
      foreach(this.numberOfPages, (i) => {
        setXYPage(i);
        return m(
          'svg',
          {
            width: (width * this.zoom) / 100,
            height: (height * this.zoom) / 100,
            viewBox: `0 0 ${width} ${height}`,
            class: i.toString(),
            onmouseup: () => dispatch(mouseUp()),
          },
          [
            m('rect', {
              x: '0',
              y: '0',
              width: '100%',
              height: '100%',
              fill: 'white',
              onmousedown: () => dispatch(clickBackground()),
              onmouseover: () => dispatch(mouseOffPitch()),
            }),
            ...splitStaves[i].map((stave, idx) =>
              stave.render(staveProps(stave, idx, i))
            ),
            ...texts(i).map((textBox) =>
              textBox.render({
                scoreWidth: width,
                selection: props.selection,
              })
            ),
            ...this.secondTimings.map((secondTiming) =>
              secondTiming.render(secondTimingProps(i))
            ),
            props.selection instanceof ScoreSelection &&
              props.selection.render(selectionProps(i)),
            this.showNumberOfPages && this.numberOfPages > 1
              ? m(
                  'text',
                  {
                    x: this.width() / 2,
                    y:
                      this.height() -
                      settings.margin +
                      settings.lineHeightOf(5),
                  },
                  (i + 1).toString()
                )
              : null,
          ]
        );
      })
    );
  }
}
