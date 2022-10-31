export interface Score {
    name: string;
    headers: (Header | TextTagHeader | SoftwareHeader)[];
    staves: Stave[];
}

export interface Stave {
    repeat: boolean;
    clef: {
        key: Accidental[];
        time: TimeSignature;
    };
    bars: Bar[];
}

export interface Accidental {
    type: "sharp" | "natural" | "flat";
    note: string;
}

export interface TimeSignature {
    type?: "cut" | "common";
    top?: string;
    bottom?: string;
}

export interface Bar {
    notes: Note[];
}

export interface Note {
    type: NoteType;
    value: NoteValue | NoteGroup | Rest;
}

export interface NoteValue {
    length: string;
    pitch: string;
    accidental: NoteAccidental;
    tied: boolean;
    fermata: boolean;
    dot: Dot;
    embellishment: Embellishment | DoubleGracenote;
}

export interface NoteGroup {
    notes: Note[];
}

export interface Rest {
    length: string;
}

export type Dot = "none" | "single" | "double";
export type NoteAccidental = "sharp" | "natural" | "flat" | "none";
export type NoteType =
    | "rest"
    | "single"
    | "duplet"
    | "triplet"
    | "quadruplet"
    | "quintuplet"
    | "sextuplet"
    | "septuplet"
    | "octuplet";

export interface DoubleGracenote {
    type: string;
    value?: {
        notes: string[];
    };
}

export interface Embellishment {
    type?: string;
    value?: {
        note: string;
    };
}

export interface Header {
    type: TokenType;
    value: string;
}

export interface TextTagHeader {
    type: TokenType;
    value: {
        text: string;
        textType: string;
    };
}

export interface SoftwareHeader {
    type: TokenType;
    value: {
        program: string;
        version: string;
    };
}

export interface SpecType {
    regex: RegExp;
    type: TokenType;
}

export interface Token {
    type: TokenType;
    value: RegExpExecArray;
}

export enum TokenType {
    SKIP = "SKIP",
    SOFTWARE_HEADER = "SOFTWARE_HEADER",
    MIDI_NOTE_MAPPINGS_HEADER = "MIDI_NOTE_MAPPINGS_HEADER",
    FREQUENCY_MAPPINGS_HEADER = "FREQUENCY_MAPPINGS_HEADER",
    INSTRUMENT_MAPPINGS_HEADER = "INSTRUMENT_MAPPINGS_HEADER",
    GRACENOTE_DURATIONS_HEADER = "GRACENOTE_DURATIONS_HEADER",
    FONT_SIZES_HEADER = "FONT_SIZES_HEADER",
    TUNE_FORMAT_HEADER = "TUNE_FORMAT_HEADER",
    TUNE_TEMPO_HEADER = "TUNE_TEMPO_HEADER",
    TEXT_TAG = "TEXT_TAG",
    CLEF = "CLEF",
    BAR_LINE = "BAR_LINE",
    TERMINATING_BAR_LINE = "TERMINATING_BAR_LINE",
    ACCIDENTAL = "ACCIDENTAL",
    FERMATA = "FERMATA",
    TIME_SIGNATURE = "TIME_SIGNATURE",
    PART_BEGINNING = "PART_BEGINNING",
    PART_END = "PART_END",
    MELODY_NOTE = "MELODY_NOTE",
    REST = "REST",
    DOTTED_NOTE = "DOTTED_NOTE",
    GRACENOTE = "GRACENOTE",
    DOUBLING = "DOUBLING",
    STRIKE = "STRIKE",
    REGULAR_GRIP = "REGULAR_GRIP",
    COMPLEX_GRIP = "COMPLEX_GRIP",
    TAORLUATH = "TAORLUATH",
    BUBBLY = "BUBBLY",
    BIRL = "BIRL",
    THROW = "THROW",
    PELE = "PELE",
    DOUBLE_STRIKE = "DOUBLE_STRIKE",
    TRIPLE_STRIKE = "TRIPLE_STRIKE",
    DOUBLE_GRACENOTE = "DOUBLE_GRACENOTE",
    TIE_OLD_FORMAT = "TIE_OLD_FORMAT",
}
