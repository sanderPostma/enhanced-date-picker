/* helper class for parsing regex from formatted date string */

class EnhancedDatePickerPart {
    constructor(initial) {
        this.initial = initial;
        this.index = 0;
        this.value = 0;
    }

    static compare(part1, part2) {
        if (part1.index < part2.index) {
            return -1;
        }
        if (part1.index > part2.index) {
            return 1;
        }
        return 0;
    }
}

window.Vaadin.Flow.enhancedDatepickerConnector = {
    initLazy: function (datepicker) {
        // Check whether the connector was already initialized for the datepicker
        if (datepicker.$connector) {
            return;
        }

        datepicker.$connector = {};

        /* init helper parts for reverse-engineering date-regex */
        datepicker.$connector.dayPart = new EnhancedDatePickerPart("22");
        datepicker.$connector.monthPart = new EnhancedDatePickerPart("11");
        datepicker.$connector.yearPart = new EnhancedDatePickerPart("1987");
        datepicker.$connector.parts = [datepicker.$connector.dayPart, datepicker.$connector.monthPart, datepicker.$connector.yearPart];

        datepicker.$connector.pattern = 'dd/MM/yyyy';
        datepicker.$connector.defaultPattern = 'dd/MM/yyyy';
        datepicker.$connector.parsers = [];
        datepicker.$connector.defaultLocale = 'en-US';
        //dd/MM/yyyy
        // Old locale should always be the default vaadin-date-picker component
        // locale {English/US} as we init lazily and the date-picker formats
        // the date using the default i18n settings and we need to use the input
        // value as we may need to parse user input so we can't use the _selectedDate value.
        let oldLocale = "en-us";

        datepicker.addEventListener('blur', e => {
            if (!e.target.value && e.target.invalid) {
                console.warn("Invalid value in the DatePicker.");
            }
        });

        const cleanString = function (string) {
            // Clear any non ascii characters from the date string,
            // mainly the LEFT-TO-RIGHT MARK.
            // This is a problem for many Microsoft browsers where `toLocaleDateString`
            // adds the LEFT-TO-RIGHT MARK see https://en.wikipedia.org/wiki/Left-to-right_mark
            return string.replace(/[^\x00-\x7F]/g, "");
        };

        const getInputValue = function () {
            let inputValue = '';
            try {
                inputValue = datepicker._inputValue;
            } catch (err) {
                /* component not ready: falling back to stored value */
                inputValue = datepicker.value || '';
            }
            return inputValue;
        };

        const formatDateBasedOnPattern = function (date, pattern, language) {
            let rawDate = new Date(date.year, date.month, date.day);
            return DateFns.format(rawDate, pattern, {locale: DateFns.locales[language]});
        };

        const formatDateBasedOnLocale = function (date, locale) {
            let rawDate = datepicker._parseDate(`${date.year}-${date.month + 1}-${date.day}`);
            // Workaround for Safari DST offset issue when using Date.toLocaleDateString().
            // This is needed to keep the correct date in formatted result even if Safari
            // makes an error of an hour or more in the result with some past dates.
            // See https://github.com/vaadin/vaadin-date-picker-flow/issues/126#issuecomment-508169514
            rawDate.setHours(12);

            return cleanString(rawDate.toLocaleDateString(locale));
        };

        const getMinParserPatternLength = function (parsersCopy) {
            let minParserLength = Number.MAX_SAFE_INTEGER;
            parsersCopy.forEach(parserCopy => {
                if (parserCopy.length < minParserLength) {
                    minParserLength = parserCopy.length;
                }
            });
            return minParserLength;
        }

        const parseDateBasedOnParsers = function (dateString, parsersCopy, language) {

            var date;
            var i;
            for (i in parsersCopy) {
                const completeDateString = dateString.length < getMinParserPatternLength(parsersCopy)
                    ? tryCompleteDateString(dateString, parsersCopy[i])
                    : dateString;

                try {
                    date = DateFns.parse(completeDateString, parsersCopy[i], new Date(), {locale: DateFns.locales[language]});
                    if (date != 'Invalid Date') {
                        break;
                        1
                    }
                } catch (err) {
                }
            }

            return {
                day: date.getDate(),
                month: date.getMonth(),
                year: date.getFullYear(),
            };
        };


        const getSeparator = function (parser) {
            for (var i = 0; i < parser.length; i++) {
                const char = parser.charCodeAt(i);
                if (char > 44 && char < 48) {
                    return parser[i];
                }
            }
        }


        const appendMonthOrDay = function (parser, result, now, separator) {
            if (parser[result.length].toUpperCase() == 'M') {
                const month = now.getMonth() + 1;
                if (month < 10 && isDoubleDigitPattern(parser, result)) {
                    result = result + '0';
                }
                result = result + month + separator;
            } else if (parser[result.length].toUpperCase() == 'D') {
                const day = now.getDate();
                if (day < 10 && parser[result.length + 1] == 'D') {
                    result = result + '0';
                }
                result = result + day + separator;
            }
            return result;
        }

        const appendYear = function (parser, result, now) {
            if (parser.includes('yyyy')) {
                result = result + now.getFullYear();
            } else if (parser.includes('yy')) {
                result = result + now.getFullYear() % 100;
            }
            return result;
        }

        const isDoubleDigitPattern = function (parser, result) {
            const separatorChar = parser[result.length].toUpperCase();
            return (separatorChar == 'D' || separatorChar == 'M')
                && parser[result.length] == parser[result.length + 1];
        }

        const tryCompleteDateString = function (dateString, parser) {
            if (parser.toUpperCase().includes("MMM")) { // Full month not supported (yet)
                return dateString;
            }

            const now = new Date();
            const separator = getSeparator(parser);
            let workString = dateString;
            let result = "";

            let count = 2;
            while (count > 0) {
                if (workString.length > 2 && dateString[1] == separator) {
                    if (isDoubleDigitPattern(parser, result)) {
                        result = result + '0';
                    }
                    result = result.concat(workString[0]).concat(separator);
                    workString = workString.substring(2);
                } else if (workString.length > 2 && dateString[2] == separator) {
                    result = result + workString.substring(0, 2) + separator;
                    workString = workString.substring(3);
                } else if (workString.length > 1) {
                    result = result.concat(workString.substring(0, 2)).concat(separator);
                    workString = workString.substring(2);
                } else if (workString.length == 1) {
                    if (isDoubleDigitPattern(parser, result)) {
                        result = result + '0';
                    }
                    result = result.concat(workString[0]).concat(separator);
                    workString = workString.substring(1);
                } else if (count == 1) {
                    result = appendMonthOrDay(parser, result, now, separator);
                }
                count--;
            }
            if (workString.length == 2) {
                result = result + ((Math.round(now.getFullYear() / 1000) * 1000) + Number(workString));
            } else if (workString.length == 0) {
                result = appendYear(parser, result, now);
            }
            return result;
        }

        const parseDateBasedOnLocale = function (dateString) {
            dateString = cleanString(dateString);
            let match = dateString.match(datepicker.$connector.regex);
            if (match && match.length == 4) {
                return {
                    day: match[1],
                    month: match[2] - 1,
                    year: match[3],
                };
            } else {
                return false;
            }
        };

        datepicker.$connector.setLocaleAndPattern = function (locale, pattern) {
            this.setLocalePatternAndParsers(locale, pattern, this.parsers);
        };

        datepicker.$connector.setLocalePatternAndParsers = function (locale, pattern, parsers) {
            let language = locale ? locale.split('-')[0] : 'enUS';
            let currentDate = false;
            let inputValue = getInputValue();
            if (datepicker.i18n.parseDate !== 'undefined' && inputValue) {
                /* get current date with old parsing */
                currentDate = datepicker.i18n.parseDate(inputValue);
            }

            /* create test-string where to extract parsing regex */
            let testDate = new Date(
                datepicker.$connector.yearPart.initial,
                datepicker.$connector.monthPart.initial - 1,
                datepicker.$connector.dayPart.initial
            );
            let testString = cleanString(testDate.toLocaleDateString(locale));
            datepicker.$connector.parts.forEach(function (part) {
                part.index = testString.indexOf(part.initial);
            });
            /* sort items to match correct places in regex groups */
            datepicker.$connector.parts.sort(EnhancedDatePickerPart.compare);
            /* create regex
             * regex will be the date, so that:
             * - day-part is '(\d{1,2})' (1 or 2 digits),
             * - month-part is '(\d{1,2})' (1 or 2 digits),
             * - year-part is '(\d{4})' (4 digits)
             *
             * and everything else is left as is.
             * For example, us date "10/20/2010" => "(\d{1,2})/(\d{1,2})/(\d{4})".
             *
             * The sorting part solves that which part is which (for example,
             * here the first part is month, second day and third year)
             *  */
            datepicker.$connector.regex = testString
                .replace(/[-[\]{}()*+?.,\\^$|#\s]/g, '\\$&')
                .replace(datepicker.$connector.dayPart.initial, '(\\d{1,2})')
                .replace(datepicker.$connector.monthPart.initial, '(\\d{1,2})')
                .replace(datepicker.$connector.yearPart.initial, '(\\d{4})');

            datepicker.i18n.formatDate = function (date) {
                if (pattern) {
                    return formatDateBasedOnPattern(date, pattern, language);
                } else if (locale) {
                    return formatDateBasedOnLocale(date, locale);
                } else {
                    console.error('Must define either a parsing pattern or a locale. Currently both are undefined.');
                }
            };

            datepicker.i18n.parseDate = function (dateString) {
                if (dateString.length == 0) {
                    return;
                }

                let parsersCopy = JSON.parse(JSON.stringify(parsers));
                if (pattern) {
                    parsersCopy.push(pattern);
                }

                if (parsersCopy.length > 0) {
                    return parseDateBasedOnParsers(dateString, parsersCopy, language);
                }

                if (locale) {
                    var result = parseDateBasedOnLocale(dateString);
                    if (result && result != false) {
                        return result;
                    }
                }
            };

            if (inputValue === '') {
                oldLocale = locale;
            } else if (currentDate) {
                /* set current date to invoke use of new locale */
                datepicker._selectedDate = new Date(currentDate.year, currentDate.month, currentDate.day);
            }
        };

        datepicker.$connector.setLocale = function (locale) {
            try {
                // Check whether the locale is supported or not
                new Date().toLocaleDateString(locale);
            } catch (e) {
                locale = "en-US";
                console.warn("The locale is not supported, using default locale setting(en-US).");
            }

            this.locale = locale;
            this.setLocalePatternAndParsers(this.locale, this.pattern, this.parsers);
        }


        datepicker.$connector.setPattern = function (pattern) {
            this.pattern = pattern ? pattern : this.defaultPattern;
            this.setLocalePatternAndParsers(this.locale, this.pattern, this.parsers);
        }

        datepicker.$connector.setParsers = function (...parsers) {
            this.parsers = parsers;
            this.setLocalePatternAndParsers(this.locale, this.pattern, this.parsers);
        }
    }
}
