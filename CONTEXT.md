# daily-wlog

A personal life-journaling app: a few minutes a day of writing and photos, accumulating into weekly reflections and, eventually, a printed book of your year.

## Language

**User**:
A person with an account. Every User owns a Journal.
_Avoid_: member, account

**Journal**:
A container of Entries belonging to a User. In the MVP each User has exactly one Journal with a single writer; the concept allows multiple Journals per User and multiple writers per Journal (couple journal) in the future.
_Avoid_: diary, book

**Category**:
A user-defined top-level label for what an Entry is about (Sport, Work, Travel). Has a colored icon chosen by the User; Subcategories inherit it. The only labeling system — there is no separate tag layer.
_Avoid_: tag, label, habit

**Subcategory**:
A user-defined refinement of a Category (Sport → basketball, gym, swim).
_Avoid_: tag, sub-tag

**Entry**:
A record inside a Journal for a specific date: title, optional note, optional photos. Carries exactly one Category, optionally refined by a Subcategory. A date can hold several Entries. Written by one User, its author, which is not necessarily the Journal's owner.
_Avoid_: journal (for a day's record), post, log
