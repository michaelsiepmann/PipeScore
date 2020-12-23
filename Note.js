import { render, svg } from 'uhtml';

/*

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
      * /

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
*/

const Note = {
  noteAndGracenoteWidth: (notes, gracenoteRatio, prevNote=null) =>
    notes.map((n,i) => 1 +
      (n.note === 'R' || n.gracenote === null)
        ? 0
        : gracenoteRatio * Gracenote.numberOfNotes(n.gracenote, n.note, i === 0 ? prevNote : notes[i - 1].note)
    ).reduce((a,b) => a + b),
    
  totalBeatWidth: (note,previousNote) => Note.noteAndGracenoteWidth(note.notes, gracenoteToNoteWidthRatio, previousNote),

  lastNoteOfWholeNote: wholeNote => wholeNote ? wholeNote.notes[wholeNote.notes.length - 1].note : null,

  numberOfNotes: note => note.notes.length,
  beamFrom: (x1,y1, x2,y2, length1,length2) => {
    // draw beams from note1 at x1,y1 to note2 x2,y2
    // where note1 is length1 long and note2 is length2
    const leftIs1 = x1 < x2;
    const leftLength = leftIs1 ? length1 : length2;
    const rightLength = leftIs1 ? length2 : length1;
    const xL = leftIs1 ? x1 : x2;
    const xR = leftIs1 ? x2 : x1;
    const yL = leftIs1 ? y1 : y2;
    const yR = leftIs1 ? y2 : y1;
    // log laws! :)
    const leftTails = Math.ceil(Math.log(1 / leftLength) / Math.log(2));
    const rightTails = Math.ceil(Math.log(1 / rightLength) / Math.log(2));


    const diffIsL = leftTails > rightTails;

    // tails shared by both notes
    const sharedTails = diffIsL ? [...Array(rightTails).keys()] : [...Array(leftTails).keys()];
    // tails extra tails for one note
    const diffTails = diffIsL ? [...Array(leftTails).keys()].splice(rightTails) : [...Array(rightTails).keys()].splice(leftTails);

    const tailEndY =
      diffIsL
      // because similar triangles
        ? yL + this.shortTailLength / (xR - xL) * (yR - yL)
        : yR - this.shortTailLength / (xR - xL) * (yR - yL);
    

    return svg`<g class="tails">
      ${sharedTails.map(
        i =>
          svg`<line
            x1=${xL}
            x2=${xR}
            y1=${yL - i * this.tailGap}
            y2=${yR - i * this.tailGap}
            stroke="black"
            stroke-width="2" />`
            )}
      ${diffTails.map(
        i =>
          svg`<line
            x1=${diffIsL ? xL : xR}
            x2=${diffIsL ? xL + this.shortTailLength : xR - this.shortTailLength}
            y1=${(diffIsL ? yL : yR) - i * this.tailGap}
            y2=${tailEndY - i * this.tailGap}
            stroke="black"
            stroke-width="2" />`
            )}
    </g>`;
  },
  
  noteHead: (x,y, note,noteIndex,selected, mousedown,mouseup) => {
    // Draw note head, ledger line and dot
    const noteWidth = 5;
    const noteHeight = 4;
    const rotation = 30;

    const clickableWidth = 14;
    const clickableHeight = 12;

    const hasDot = (Math.log(note.length) / Math.log(2)) % 1 !== 0;
    const dotYOffset = (['G','B','D','F','HA'].includes(note.note)) ? -3 : 0;
    const dotXOffset = 10;
    const dragged = this.draggedNote === noteIndex;


    // pointer events must be set so that if it is being
    // dragged, it shouldn't get pointer events because
    // that interferes with the drag boxes (you can't
    // drag downwards a single box)
    const pointerEvents = dragged ? 'none' : 'visiblePainted';

    const filled = note.length < 1.5; // shorter than a dotted crotchet

    const rotateText = "30deg " + Math.round(x) + " " + Math.round(y);

    const colour = selected ? "orange" : "black";

    return svg`<g class="note-head">
      <ellipse cx=${x} cy=${y} rx="5" ry="4" stroke=${colour} fill=${filled ? colour : "white"} transform=${`rotate(30 ${x} ${y})`} pointer-events=${pointerEvents} />

      ${hasDot ? svg`<circle cx=${x + dotXOffset} cy=${y + dotYOffset} r="1.5" fill=${colour} pointer-events="none" />` : null}

      ${(note.note === 'HA') ? svg`<line class="ledger" x1=${x - 8} x2=${x + 8} y1=${y} y2=${y} stroke=${colour} pointer-events="none" />` : null}


      <rect x=${x - clickableWidth / 2} y=${y - clickableHeight / 2} width=${clickableWidth} height=${clickableHeight} onmousedown=${mousedown} onmouseup=${mouseup} pointer-events=${pointerEvents} opacity="0"/>
    </g>`;
  },
  singleton: (note,noteIndex,lastNote, x,y, noteWidth,numberOfTails) => {
    const stemX = x - 5;
    const stemY = noteOffset(y) + 30;

    const gracenoteProps = ({
      x: x,
      y: y,
      gracenoteWidth: noteWidth * 0.6,
      thisNote: note.note,
      previousNote: lastNote
    })

    return svg`
      ${note.gracenote === null ? null : Gracenote.render(note.gracenote, gracenoteProps)}

      ${this.noteHead(x, noteY(y, note.note), note,this.selectedNotes.includes(noteIndex), e => this.click(0, e), this.unclick)}
      ${(note.length > 3) ? null : svg`<line
        x1=${stemX}
        x2=${stemX}
        y1=${y}
        y2=${stemY}
        stroke="black"
        />`}
      ${numberOfTails > 0 ? svg`<g class="tails">
        ${[...Array(numberOfTails).keys()].map(t => svg`<line x1=${stemX} x2=${stemX + 10} y1=${stemY - 5 * t} y2=${stemY - 5 * t - 10} stroke="black" />`)}
      </g>` : null}
    `;
  },

  render: (note,props) => {

    // takes a note and returns not the actual index, but the index including
    // gracenoteToNoteWidthRatio * all the gracenotes up to it
    // useful for x calculations

    const lastNote = props.previousNote || null;
    const relativeIndexOfGracenote = (note,index) => Note.noteAndGracenoteWidth(note.notes.slice().splice(0,index), gracenoteToNoteWidthRatio, lastNote);
    const relativeIndexOf = (note,index) => relativeIndexOfGracenote(note,index) + gracenoteToNoteWidthRatio * (note.gracenote === null ? 0 : note.gracenote.numberOfNotes(note.note, index === 0 ? lastNote : note.notes[index - 1].note));
    const xOf = (note,noteIndex) => props.x + relativeIndexOf(note,noteIndex) * props.noteWidth;
    const yOf = note => noteY(props.y, note.note);

    const stemXOf = note => xOf(note) - 5;

    if (Note.numberOfNotes(note) === 1 && note.notes[0].note === 'R') {
          
      return svg`<g class="rest">
        <circle cx=${props.x} cy=${props.y} r="10" fill="red" />
      </g>`;

    } else if (this.numberOfNotes === 1) {
      const note = note.notes[0];
      const numberOfTails = Math.ceil(-1 * Math.log(note.length) / Math.log(2));
      return Note.singleton(note,0,lastNote,props.x,props.y,props.noteWidth,numberOfTails);
    } else {
      const cap = (n, cap) =>
        (n > cap) ? cap :
        (n < -cap) ? -cap :
        n;

      const diff = cap(
        // todo cap should be dependent on how many notes are in the group
        // difference between first and last notes in a group
        noteOffset(note.notes[note.notes.length - 1].note)
        - noteOffset(note.notes[0].note),
        10);
      

      let multiple = false;
      const lowestNote = note.notes.reduce((last,next) => {
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
      const multipleLowest = multiple;

      const stemOffset = note => 
        noteOffset(lowestNote.note) - noteOffset(note.note);

      const diffForLowest = 30 + noteOffset(lowestNote.note) - (multipleLowest ? 0 : diff * relativeIndexOf(lowestNote) / Note.totalBeatWidth(note,props.previousNote));

      const stemYOf = note => 
        props.y()
          + (multipleLowest()
            // straight line if there is more than one lowest note
            ? 0
            // otherwise use a slant
            : diff * relativeIndexOf(note) / Note.totalBeatWidth(note,props.previousNote))
          // offset so that the lowest note is always a constant height
          + diffForLowest;
      // Intentional double equals (array out of bounds)
      const notANote = note => note == null || note.note === 'R';

      const isSingleton = (note,index) => !(notANote(note.notes[index - 1]) || notANote(note.notes[index + 1]));


      return svg`
        <g class="grouped-notes">
          ${note.notes.map(
            // todo replace all note with shortNote
            (shortNote,index) => {
              let previousNote = note.notes[index - 1];

              const gracenoteProps = ({
                x: props.x + props.noteWidth * relativeIndexOfGracenote(shortNote),
                y: props.y,
                gracenoteWidth: props.noteWidth * 0.6,
                thisNote: shortNote.note,
                previousNote: previousNote ? previousNote.note : lastNote
              })

              return svg`<g class="grouped-note">
                  ${shortNote.gracenote === null ? null : Gracenote.render(shortNote.gracenote,gracenoteProps)}

                  ${/*todo*/Note.noteHead(xOf(shortNote), yOf(shortNote), shortNote,props.selectedNotes.includes(index), e => Note.click(index, e), Note.unclick)}

                  ${
                    previousNote ? this.beamFrom(stemXOf(shortNote),stemYOf(shortNote), stemXOf(previousNote),stemYOf(previousNote), shortNote.length, previousNote.length) : null)
                  }

                  <line
                    x1=${stemXOf(shortNote)}
                    x2=${stemXOf(shortNote)}
                    y1=${yOf(shortNote)}
                    y2=${stemYOf(shortNote)}
                    stroke="black"
            }
          )}
        </g>`;
    }

  },

  init: () => ({
    notes: [{note: 'A'}]
  })
}
