const { html, svg, map, observable, computed, subscribe } = sinuous;
const o = observable;


// todo actually work out an algorithm that works for finding
// the point where the stem meets the note head

// Logging functions
const log = a => {
  console.log(a);
  return a;
}

const log2 = (a,b) => {
  console.log(a);
  return b;
}

const unlog = (a) => a;
const unlogf = (a) => a;
const unlog2 = (a,b) => b;

// function log (useful for observables)
const logf = a => {
  console.log(a());
  return a;
}



/*
const selectedItems = o([]);
const select = i => {
  const nextSelectedItems = selectedItems();
  if (nextSelectedItems.includes(i)) return;
  nextSelectedItems.push(i);
  selectedItems(nextSelectedItems);
}
const deselect = i => {
  const bef = selectedItems().splice(0, selectedItems.indexOf(i));
  const aft = selectedItems().splice(selectedItems.indexOf(i) + 1, selectedItems().length -1;

  selectedItems([...bef,...aft]);
}*/


const noteHeights = new Map();
noteHeights.set('HA', -1);
noteHeights.set('HG', -0.5);
noteHeights.set('F', 0);
noteHeights.set('E', 0.5);
noteHeights.set('D', 1);
noteHeights.set('C', 1.5);
noteHeights.set('B', 2);
noteHeights.set('A', 2.5);
noteHeights.set('G', 3);
const noteOffset = (note) => {
  // Return the difference from the top of the stave
  // to the note
  return lineHeightOf(noteHeights.get(note));
}

const noteY = (staveY, note) => {
  // return the y value of given note
  return staveY + noteOffset(note);
}

const gracenotes = new Map();
gracenotes.set('throw-d', (note,_) => note === 'D' ? ['G','D','C'] : -1);
gracenotes.set('doubling', (note,prev) => {
  let init = [];
  if (note === 'G' || note === 'A' || note === 'B' || note === 'C') {
    init = ['HG', note, 'D'];
  } else if (note === 'D') {
    init = ['HG', note, 'E'];
  } else if (note === 'E') {
    init = ['HG', note, 'F'];
  } else if (note === 'F') {
    init = ['HG', note, 'HG'];
  } else if (note === 'HG') {
    // ['HA', note, 'HA'] or ['HG','F'] ?
    init = ['HA',note,'HA'];
  } else if (note === 'HA')  {
    init = ['HA', 'HG'];
  } else {
    return -1;
  }

  if (prev === 'HG' && (note !== 'HA' || note !== 'HG')) {
    init[0] = 'HA';
  } else if (prev === 'HA') {
    init = init.splice(1);

    if (note === 'HG') init = ['HG','F'];
  }

  return init
});

class Gracenote {
  // this is a pure component - should probably be in a function but it isn't so well
  //self = o({ type: 'single', note: 'HG' });
  self = o({ type: 'reactive', gracenote: 'doubling' })

  tailXOffset = 3;
  numberOfNotes = (thisNote, previousNote) => computed(() => {
    if (this.self().type === 'single') {
      return 1;
    } else if (this.self().type === 'reactive') {
      return this.notes(thisNote,previousNote).length;
    }
  });

  notes = (thisNote, previousNote) => {
    if (thisNote === 'R') return [];

    if (this.self().type === 'single') {
      return this.self().note;
    } else if (this.self().type === 'reactive') {
      return gracenotes.get(this.self().gracenote)(thisNote,previousNote);
    }

  }

  head = (x,y, note, beamY) => {
    const ledgerLeft = 5;
    const ledgerRight = 5.2;
    // todo: make ledger line the correct length
    return svg`<g class="gracenote-head">
      ${note === 'HA' ? svg`<line x1=${x - ledgerLeft} x2=${x + ledgerRight} y1=${y} y2=${y} stroke="black" />` : null}
      <ellipse cx=${x} cy=${y} rx="3.5" ry="2.5" transform="rotate(-30 ${x} ${y})" fill="black" pointer-events="none" />

      <line x1=${x + this.tailXOffset} y1=${y} x2=${x + this.tailXOffset} y2=${beamY} stroke="black" /> 
    </g>`;
  }

  single(note,props) {
    const rad = n => n * Math.PI / 180;
    const stemXOf = x => x + 3;
    const stemYOf = y => y - 2;
    const y = computed(() => noteY(props.y(), note));
    return svg`<g class="gracenote">
      ${computed(() => this.head(props.x(),y(), note, props.y() - 3 * lineGap))}
  
      <line x1=${computed(() => stemXOf(props.x()))} x2=${computed(() => stemXOf(props.x()))} y1=${computed(() => stemYOf(y()))} y2=${computed(() => stemYOf(y()) - 20)} stroke="black" />
  
      ${[0,1,2].map(n => svg`<line x1=${computed(() => stemXOf(props.x()))} x2=${computed(() => stemXOf(props.x()) + 5)} y1=${computed(() => stemYOf(y()) - 20 + 3 * n)} y2=${computed(() => stemYOf(y()) - 16 + 3 * n)} stroke="black" />`)}
    </g>`;
  }

  render = (props) => {
    const rad = n => n * Math.PI / 180
    const stemXOf = x => x + 3;
    const stemYOf = y => y - 2;
    return svg`<g class="gracenote">
      ${computed(() => {
        const self = this.self();
        if (self.type === 'single') {
          this.single(self.note, props);
        } else if (self.type === 'reactive') {
          // notes must be mapped to objects so that .indexOf will give
          // the right answer (so it will compare by reference
          // rather than by value)
          // TYPE ERROR
          const notes = computed(() => this.notes(props.thisNote, props.previousNote).map(note => ({ note })));
          if (notes().length === 1) {
            return this.single(notes()[0].note, props);
          } else {
            const xOf = (noteObj) => props.x() + notes().indexOf(noteObj) * props.gracenoteWidth() * 0.6 - props.gracenoteWidth() * 0.3;
            const y = note => computed(() => noteY(props.y(), note));
            return svg`<g class="reactive-gracenote">
              ${[0,2,4].map(i => svg`<line x1=${xOf(notes()[0]) + this.tailXOffset} x2=${xOf(notes()[notes().length - 1]) + this.tailXOffset} y1=${props.y() - 3.5 * lineGap + i} y2=${props.y() - 3.5 * lineGap + i} stroke="black" />`
              )}
              ${map(notes,
                noteObj => this.head(xOf(noteObj), y(noteObj.note)(), noteObj.note, props.y() - 3.5 * lineGap)
              )}
            </g>`;
          }
        }
      })}
    </g>`;
  }
}

class Note {
  // TODO gaps between notes still not right (e.g. set all to doublings in a bar, or have two high As after each other)
  // todo rests - by using a note of the form { note: 'R', ... }
  // type NoteObj = { note: Pitch, length: number, gracenote: Gracenote | null }
  // notes: []NoteObj
  notes = o([]);

  tailGap = 5;
  shortTailLength = 10;

  draggedNote = o(null);
  selectedNotes = o([]);
  eventListener = null;

  numberOfNotes = computed(() => this.notes().length);

  // prevNote: Pitch
  noteAndGracenoteWidth = (notes, gracenoteRatio, prevNote = null) => notes.map((n,i) => 1 + ((n.note === 'R' || n.gracenote === null)
    ? 0
    : gracenoteRatio * n.gracenote.numberOfNotes(n.note, i === 0 ? prevNote : notes[i - 1].note)())
    ).reduce((a,b) => a + b,0);

  totalBeatWidth = previousNote => computed(() => this.noteAndGracenoteWidth(this.notes(), gracenoteToNoteWidthRatio, previousNote));

  subscribeToMouse = () => null;
  unsubscribeToMouse = () => null;
  mouseSubFn = null;

  constructor(sub,unsub) {
    this.subscribeToMouse = sub;
    this.unsubscribeToMouse = unsub;
    this.notes([{ note: 'G', length: 1, gracenote: new Gracenote() }])
    //this.notes([{ note: 'G', length: 0.375, gracenote: new Gracenote() }, { note: 'R', length: 0.5, gracenote: new Gracenote(sub, unsub) }, { note: 'A', length: 0.125, gracenote: new Gracenote()}]);
    //this.notes([{ note: 'R', length: 1, gracenote: null }]);


    on('delete-selected-note', () => {
      let notes = this.notes();
      // has to be replaced with null then removed all at the // same way so that the later indices in selectedNotes 
      // are still valid
      this.selectedNotes().forEach(n => notes[n] = null);
      notes = notes.filter(n => n !== null);
      this.notes(notes);
      this.deselect();
    })
  }


  beamFrom = (x1,y1, x2,y2, length1,length2) => {
    // draw beams from note1 at x1,y1 to note2 x2,y2
    // where note1 is length1 long and note2 is length2
    const leftIs1 = computed(() => x1() < x2());
    const leftLength = computed(() => leftIs1() ? length1 : length2);
    const rightLength = computed(() => leftIs1() ? length2 : length1);
    const xL = computed(() => leftIs1() ? x1() : x2());
    const xR = computed(() => leftIs1() ? x2() : x1());
    const yL = computed(() => leftIs1() ? y1() : y2());
    const yR = computed(() => leftIs1() ? y2() : y1());
    // log laws! :)
    const leftTails = computed(() => Math.ceil(Math.log(1 / leftLength()) / Math.log(2)));
    const rightTails = computed(() => Math.ceil(Math.log(1 / rightLength()) / Math.log(2)));


    const diffIsL = computed(() => leftTails() > rightTails());

    // tails shared by both notes
    const sharedTails = computed(() => diffIsL() ? [...Array(rightTails()).keys()] : [...Array(leftTails()).keys()]);
    // tails extra tails for one note
    const diffTails = computed(() => diffIsL() ? [...Array(leftTails()).keys()].splice(rightTails()) : [...Array(rightTails()).keys()].splice(leftTails()));

    const tailEndY = computed(() =>
      diffIsL()
      // because similar triangles
        ? yL() + this.shortTailLength / (xR() - xL()) * (yR() - yL())
        : yR() - this.shortTailLength / (xR() - xL()) * (yR() - yL()));
    

    return svg`<g class="tails">
      ${map(sharedTails,
        i =>
          svg`<line
            x1=${xL}
            x2=${xR}
            y1=${computed(() => yL() - i * this.tailGap)}
            y2=${computed(() => yR() - i * this.tailGap)}
            stroke="black"
            stroke-width="2" />`
            )}
      ${map(diffTails,
        i =>
          svg`<line
            x1=${computed(() => diffIsL() ? xL() : xR())}
            x2=${computed(() => diffIsL() ? xL() + this.shortTailLength : xR() - this.shortTailLength)}
            y1=${computed(() => (diffIsL() ? yL() : yR()) - i * this.tailGap)}
            y2=${computed(() => tailEndY() - i * this.tailGap)}
            stroke="black"
            stroke-width="2" />`
            )}
    </g>`;
  }
  setNote = (i, note) => {
    // params: i int, note G | A | B | ...
    // set a note to the note given
    const newNotes = this.notes().slice();
    if (i != null) newNotes[i] = { ...newNotes[i], note: note };
    (i != null) ? this.notes(newNotes) : this.notes([{ note: note, length: 1, gracenote: new Gracenote() }]);
  }
  validNoteLengths = (notes) =>
    notes.reduce((a,b) => { length: a.length + b.length },{ length: 0 }) === this.length;
  
  changeNoteLength = (i,newLength) => {
    const newNotes = this.notes().slice();
    const oldNote = newNotes[i];
    newNotes[i] = { ...oldNote, length: newLength };

    this.notes(newNotes);
  }

  select = (i) => {
    if (!this.selectedNotes().includes(i)) this.selectedNotes([...this.selectedNotes(), i])
    on('deselect-all-notes', this.deselect);
  }
  deselect = () => {
    this.selectedNotes([]);
    removeEvent('deselect-all-notes', this.deselect);
  }

  click = (i, event) => {
    // drag note at index i in this.notes()
    // and add event listener for dragging
    if (!event.shiftKey) {
      dispatchEvent('deselect-all-notes');
      this.draggedNote(i);
      this.mouseSubFn = n => this.setNote(i,n)
      this.subscribeToMouse(this.mouseSubFn);
    }
    this.select(i);
    document.addEventListener('mouseup', this.unclick);
  }
  unclick = () => {
    // deselect note and remove event listener started
    // by this.select(i)
    this.draggedNote(null);
    document.removeEventListener('mouseup', this.unclick);
    this.unsubscribeToMouse(this.mouseSubFn);
  }
  noteHead = (x,y, note,selected, mousedown,mouseup) => {
    // Draw note head, ledger line and dot
    const noteWidth = 5;
    const noteHeight = 4;
    const rotation = 30;

    const clickableWidth = 14;
    const clickableHeight = 12;

    const hasDot = (Math.log(note.length) / Math.log(2)) % 1 !== 0;
    const dotYOffset = (['G','B','D','F','HA'].includes(note.note)) ? -3 : 0;
    const dotXOffset = 10;
    const dragged = computed(() => this.draggedNote() === this.notes().indexOf(note));


    // pointer events must be set so that if it is being
    // dragged, it shouldn't get pointer events because
    // that interferes with the drag boxes (you can't
    // drag downwards a single box)
    const pointerEvents = computed(() => dragged() ? 'none' : 'visiblePainted');

    const filled = note.length < 1.5; // shorter than a dotted crotchet

    const rotateText = computed(() => "30deg " + Math.round(x()) + " " + Math.round(y()));

    const colour = computed(() => selected() ? "orange" : "black");

    return svg`<g class="note-head">
      <ellipse cx=${x} cy=${y} rx="5" ry="4" stroke=${colour} fill=${computed(() => filled ? colour : "white")} transform=${computed(() => `rotate(30 ${x()} ${y()})`)} pointer-events=${pointerEvents} />

      ${hasDot ? svg`<circle cx=${computed(() => x() + dotXOffset)} cy=${computed(() => y() + dotYOffset)} r="1.5" fill=${colour} pointer-events="none" />` : null}

      ${(note.note === 'HA') ? svg`<line class="ledger" x1=${computed(() => x() - 8)} x2=${computed(() => x() + 8)} y1=${y} y2=${y} stroke=${colour} pointer-events="none" />` : null}


      <rect x=${computed(() => x() - clickableWidth / 2)} y=${computed(() => y() - clickableHeight / 2)} width=${clickableWidth} height=${clickableHeight} onmousedown=${mousedown} onmouseup=${mouseup} pointer-events=${pointerEvents} opacity="0"/>
    </g>`;
  }


  singleton = (note,lastNote, x,y, noteWidth,numberOfTails) => {
    const stemX = computed(() => x() - 5);
    const stemY = computed(() => noteOffset(y) + 30);

    return svg`
      ${note.gracenote === null ? null : svg`<${note.gracenote.render} x=${x} y=${y} gracenoteWidth=${computed(() => noteWidth * 0.6)} thisNote=${note.note} previousNote=${lastNote} />`}

      ${this.noteHead(x, computed(() => noteY(y(), note.note)), note,computed(() => this.selectedNotes().includes(this.notes().indexOf(note))), e => this.click(0, e), this.unclick)}
      ${(note.length > 3) ? null : svg`<line
        x1=${stemX}
        x2=${stemX}
        y1=${y}
        y2=${stemY}
        stroke="black"
        />`}
      ${numberOfTails > 0 ? svg`<g class="tails">
        ${[...Array(numberOfTails).keys()].map(t => svg`<line x1=${stemX} x2=${computed(() => stemX() + 10)} y1=${computed(() => stemY() - 5 * t)} y2=${computed(() => stemY() - 5 * t - 10)} stroke="black" />`)}
      </g>` : null}
    `;
  }

  render = (props) => {
    // render self

    // takes a note and returns not the actual index, but the index including
    // gracenoteToNoteWidthRatio * all the gracenotes up to it
    // useful for x calculations

    const lastNote = computed(() => props.previousNote() ? props.previousNote() : null);
    const relativeIndexOfGracenote = note => computed(() => this.noteAndGracenoteWidth(this.notes().slice().splice(0,this.notes().indexOf(note)), gracenoteToNoteWidthRatio, lastNote()));
    const relativeIndexOf = note => computed(() => relativeIndexOfGracenote(note)() + gracenoteToNoteWidthRatio * (note.gracenote === null ? 0 : note.gracenote.numberOfNotes(note.note, this.notes().indexOf(note) === 0 ? lastNote() : this.notes()[this.notes().indexOf(note) - 1].note)()));
    const xOf = note => computed(() => props.x() + relativeIndexOf(note)() * props.noteWidth());
    const yOf = note => computed(() => noteY(props.y(), note.note));

    const stemXOf = note => computed(() => xOf(note)() - 5);

    return svg`<g class="note">
      ${computed(() => {
        if (this.numberOfNotes() === 1 && this.notes()[0].note === 'R') {
          return svg`<g class="rest">
            <circle cx=${props.x} cy=${props.y} r="10" fill="red" />
          </g>`

        } else if (this.numberOfNotes() === 1) {
          const note = this.notes()[0];
          const numberOfTails = Math.ceil(-1 * Math.log(note.length) / Math.log(2));
          return this.singleton(note,lastNote(),props.x,props.y,props.noteWidth(),numberOfTails);

/*
      return svg`
        ${note.gracenote === null ? null : svg`<${note.gracenote.render} x=${computed(() => props.x() + props.noteWidth() * relativeIndexOfGracenote(note)())} y=${props.y} gracenoteWidth=${computed(() => props.noteWidth() * 0.6)} thisNote=${computed(() => this.notes()[0].note)} previousNote=${lastNote} />`}

        ${this.noteHead(xOf(note), computed(() => noteY(props.y(), note.note)), note,computed(() => this.selectedNotes().includes(this.notes().indexOf(note))), e => this.click(0, e), this.unclick)}
        ${(note.length > 3) ? null : svg`<line
          x1=${stemXOf(note)}
          x2=${stemXOf(note)}
          y1=${yOf(note)}
          y2=${stemYOf(note)}
          stroke="black"
          />`}
        ${numberOfTails > 0 ? svg`<g class="tails">
          ${[...Array(numberOfTails).keys()].map(t => svg`<line x1=${stemXOf(note)} x2=${computed(() => stemXOf(note)() + 10)} y1=${computed(() => stemYOf(note)() - 5 * t)} y2=${computed(() => stemYOf(note)() - 5 * t - 10)} stroke="black" />`)}
        </g>` : null}
      `;
      */

        } else {
          const cap = (n, cap) =>
            (n > cap) ? cap :
            (n < -cap) ? -cap :
            n;

          const diff = computed(() => cap(
            // todo cap should be dependent on how many notes are in the group
            // difference between first and last notes in a group
            noteOffset(this.notes()[this.notes().length - 1].note)
            - noteOffset(this.notes()[0].note
            ), 10));
          
          const multipleLowest = o(false);

          const lowestNote = computed(() => {
            let multiple = false;
            let lowestNote = this.notes().reduce((last,next) => {
              if (noteOffset(next.note) === noteOffset(last.note)) {
                multiple = true;
                return last;
              } else if (noteOffset(next.note) > noteOffset(last.note)) {
                multiple = false;
                return next;
              } else {
                return last;
              }
            });
            if (multiple) {
              multipleLowest(true);
            }
            return lowestNote;
          });

          const stemOffset = note => computed(() => {
            return (noteOffset(lowestNote().note) - noteOffset(note.note));
          });

          const diffForLowest = computed(() => 30 + noteOffset(lowestNote().note) - (multipleLowest ? 0 : diff() * relativeIndexOf(lowestNote())() / this.totalBeatWidth(props.previousNote())()));

          const stemYOf = note => computed(() => {
            return props.y()
              + (multipleLowest()
                // straight line if there is more than one lowest note
                ? 0
                // otherwise use a slant
                : diff() * relativeIndexOf(note)() / this.totalBeatWidth(props.previousNote())())
              // offset so that the lowest note is always a constant height
              + diffForLowest();
          });
          // Intentional double equals (array out of bounds)
          const notANote = note => note == null || note.note === 'R';

          const isSingleton = note => computed(() => !(notANote(this.notes()[this.notes().indexOf(note) - 1]) || notANote(this.notes()[this.notes().indexOf(note) + 1])));


          return svg`
            <g class="grouped-notes">
              ${map(
                this.notes,
                note => {
                  let previousNote = computed(() => this.notes()[this.notes().indexOf(note) - 1]);

                  return svg`<g class="grouped-note">
                      ${note.gracenote === null ? null : svg`<${note.gracenote.render} x=${computed(() => props.x() + props.noteWidth() * relativeIndexOfGracenote(note)())} y=${props.y} gracenoteWidth=${computed(() => props.noteWidth() * 0.6)} thisNote=${computed(() => this.notes()[this.notes().indexOf(note)].note)} previousNote=${this.notes()[this.notes().indexOf(note) - 1] ? o(this.notes()[this.notes().indexOf(note) - 1].note) : lastNote} />`}

                      ${computed(() => this.noteHead(xOf(note), yOf(note), note,computed(() => this.selectedNotes().includes(this.notes().indexOf(note))), e => this.click(this.notes().indexOf(note),  e), this.unclick))}

                      ${
                        computed(() => previousNote() ? this.beamFrom(stemXOf(note),stemYOf(note), stemXOf(previousNote()),stemYOf(previousNote()), note.length, previousNote().length) : null)
                      }

                      <line
                        x1=${stemXOf(note)}
                        x2=${stemXOf(note)}
                        y1=${yOf(note)}
                        y2=${stemYOf(note)}
                        stroke="black"
                        />
                    </g>`
                }
              )}
            </g>`;
        }
      })}
    </g>`;

  }
}

class Bar {

  // For mouse dragging, an observable cannot be used since it causes
  // stack overflow.
  // This is because in order to change the notes (when the mouse is dragged)
  // Note.setNote needs to know what the notes currently are, which
  // triggers it to run again.
  // Basically, don't refactor this to an observable! :)
  // START
  mouseDragSubscribers = [];
  lastMouseDragValue = null;
  mouseDrag = note => {
    if (note !== this.lastMouseDragValue) {
      this.mouseDragSubscribers.forEach(sub => sub(note));
      this.lastMouseDragValue = note;
    }
  }
  subscribeToMouseDrag = fn => this.mouseDragSubscribers.push(fn);
  unsubscribeToMouseDrag = fn => this.mouseDragSubscribers.splice(this.mouseDragSubscribers.indexOf(fn), 1);

  // END



  notes = o([new Note(this.subscribeToMouseDrag,this.unsubscribeToMouseDrag), new Note(this.subscribeToMouseDrag, this.unsubscribeToMouseDrag)]);

  dragBoxes = (x,y,width) => {
    // Invisible rectangles that are used to detect note dragging
    const height = lineGap / 2;

    return svg`<g class="drag-boxes">
      
      <rect x=${x} y=${computed(() => y() - 4 * lineGap)} width=${width} height=${lineGap * 4} onmouseover=${() => this.mouseDrag('HA')} opacity="0" />
      <rect x=${x} y=${computed(() => y() + 3.5 * lineGap)} width=${width} height=${lineGap * 4} onmouseover=${() => this.mouseDrag('G')} opacity="0" />

      ${[...noteHeights.entries()].map(([note,boxY]) => 
        svg`<rect
          x=${x}
          y=${computed(() => y() + lineGap * boxY - lineGap / 2)}
          width=${width}
          height=${height}
          onmouseover=${() => this.mouseDrag(note)}
          opacity="0"

          />`)}
    </g>`
  }


  render = (props) => {
    const staveY = props.y;

    const lastNoteOfWholeNote = wholeNote => computed(() => wholeNote ? wholeNote.notes()[wholeNote.notes().length - 1].note : null)

    const previousWholeNote = computed(() => props.previousBar() ? props.previousBar().notes()[props.previousBar().notes().length - 1] : null);
    const previousNote = computed(() => lastNoteOfWholeNote(previousWholeNote())());
    const previousNoteOf = note => computed(() => {
      if (this.notes().indexOf(note) === 0) {
        return previousNote();
      } else {
        return this.notes()[this.notes().indexOf(note) - 1];
      }
    });
    
    const beats = computed(() => this.notes()
      .reduce(([nums, current], n) => {
        const num = current + n.totalBeatWidth(previousNoteOf(n)())();
        nums.push(num);
        return [nums, num];
      }, [[1], 1]));
    
    const totalNumberOfBeats = computed(() => beats()[1]);
    const beatWidth = computed(() => props.width() / totalNumberOfBeats());

    const getX = note => computed(() => props.x() + beatWidth() * beats()[0][this.notes().indexOf(note)]);

    return svg`

      <g class="bar">
        ${this.dragBoxes(props.x,staveY, props.width)}
        ${map(
          this.notes,
          note => svg`<${note.render} x=${getX(note)} y=${staveY} noteWidth=${beatWidth} previousNote=${computed(() => this.notes().indexOf(note) === 0 ? previousNote() : lastNoteOfWholeNote(this.notes()[this.notes().indexOf(note) - 1])())}/>`
        )}

        <line x1=${props.x} x2=${props.x} y1=${staveY} y2=${computed(() => lineHeightOf(4) + props.y())} stroke="black" />
      </g>`;
  }
}


class Stave {
  bars = o([new Bar(), new Bar(), new Bar(), new Bar()]);

  render = (props) => {
    const staveHeight = props.y;

    const staveLines = computed(() => [...Array(5).keys()].map(idx => lineHeightOf(idx) + staveHeight()));

    const barWidth = computed(() => props.width / this.bars().length);

    const getX = bar => computed(() => this.bars().indexOf(bar) * barWidth() + props.x);

    const previousBar = bar => computed(() => this.bars().indexOf(bar) === 0 ? (props.previousStave() ? props.previousStave().bars()[props.previousStave().bars().length - 1] : null) : this.bars()[this.bars().indexOf(bar) - 1]);

    return svg`
      <g class="stave">
        <g class="notes">
          ${map(
            this.bars,
            bar => svg`<${bar.render} x=${getX(bar)} y=${staveHeight} width=${barWidth} previousBar=${previousBar(bar)} />`
          )}
        </g>
        <g class="stave-lines">
          ${map(
            staveLines,
            y => svg`<line x1=${props.x} x2=${props.x + props.width} y1=${y} y2=${y} stroke="black" />`)
          }
        </g>
      </g>
    `
  }
}


class Score {
  width =  210 * 5;
  height = 297 * 5;
  margin = 30;
  staveGap = 100;
  topOffset = 150;

  staves = o([new Stave(), new Stave()])

  render = () => {
    return svg`
      <svg width=${this.width} height=${this.height}>
        <rect fill="white" x="0" y="0" width="100%" height="100%" />

        <g class="stavelines">
        ${map(
          this.staves,
          (stave) => svg`<${stave.render} x=${this.margin} y=${computed(() => this.staves().indexOf(stave) * this.staveGap + this.topOffset)} width=${this.width - 2 * this.margin} previousStave=${computed(() => this.staves().indexOf(stave) === 0 ? null : this.staves()[this.staves().indexOf(stave) - 1])} />`
        )}
        </g>
      </svg>
    `;
  }
}

function on(event, callback) {
  return document.getElementById('event').addEventListener(event, callback);
}

function removeEvent(event, callback) {
  return document.getElementById('event').removeEventListener
}
function dispatchEvent(event) {
  return document.getElementById('event').dispatchEvent(new CustomEvent(event));
}

function keyHandler(event) {
  switch (event.keyCode) {
    case 27: /* Escape */
      dispatchEvent('deselect-all-notes');
      break;
    case 46: /* Delete */
      dispatchEvent('delete-selected-note');
      break;
  }
}

function UI() {
  const score = new Score();
  return html`<div>
    <div id="ui">
      <button onclick=${() => dispatchEvent('delete-selected-note')} title="Delete all selected notes (highlighted in orange). Keybinding: Delete key">Delete selected note</button>
      <button onclick=${() => dispatchEvent('deselect-all-notes')} title="Deselect all selected notes (highlighted in orange). Keybinding: Escape">Deselect All Notes</button>
    </div>
    <${score.render} />
  </div>`
}

document.getElementById('root').appendChild(UI());
document.addEventListener('keydown', keyHandler);