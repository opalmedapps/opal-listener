// eslint-disable-next-line max-len
// SPDX-FileCopyrightText: Copyright 2022 Opal Health Informatics Group at the Research Institute of the McGill University Health Centre <john.kildea@mcgill.ca>
//
// SPDX-License-Identifier: AGPL-3.0-or-later

/**
 * @file Setup file to import into each mocha test file. Reduces boilerplate code at the beginning of test files.
 */

import chaiAsPromised from 'chai-as-promised';
import { use } from 'chai';

use(chaiAsPromised);
