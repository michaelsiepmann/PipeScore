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

//  Documentation - explanations for the UI that are shown on hover.

import { getLanguage } from '../common/i18n';
import { Documentation } from './Translations';
import { EnglishTranslation } from './Translations/English';
import { FrenchTranslation } from './Translations/French';

function getDocForSelectedLanguage(doc: keyof Documentation) {
  switch (getLanguage()) {
    case 'ENG':
      return EnglishTranslation[doc];
    case 'FRA':
      return FrenchTranslation[doc];
    default:
      return '';
  }
}

export default function (doc: keyof Documentation) {
  const helpText = getDocForSelectedLanguage(doc) || EnglishTranslation[doc];
  return helpText.replaceAll(/\.\s?/g, '.\n\n');
}
