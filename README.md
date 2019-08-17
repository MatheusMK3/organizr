# Organizr
🗂️ Simple Node.js tool to organize folders based on files based on modified date.

## Usage
By default, running the script will only give you a preview of what is going to be changed. To actually move any files, run the script with the 'move' argument.

### Options
Organizr has a few options that can be passed from the console:

#### Path
You can provide another path to run the script by using the ``path=/path/to/my/directory`` argument.

#### Time
You can switch to creation-time by using the ``time=created`` argument.

#### Preferred Time
You can switch to using the last registered time by using the ``prefer=max`` argument.
