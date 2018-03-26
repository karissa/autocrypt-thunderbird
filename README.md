# autocrypt-thunderbird
WIP Extension for Autocrypt in Thunderbird

## installing in development mode 

You need Thunderbird 52. 

Then link your/a Thunderbird profile with the autocrypt-thunderbird extension:

- Use Mozilla's [extension installation
  instruction](https://developer.mozilla.org/en-US/docs/Mozilla/Thunderbird/Thunderbird_extensions/Building_a_Thunderbird_extension_7:_Installation) and where you create "the file to reference your extension files", use "autocrypt@autocrypt.org" as filename
 and put in a single line that is the path to the directory of your checkout of autocrypt-thunderbird. 

- Initially and after any change you need to run:

  - "npm install" 
  - "npm run build" 
  - restart Thunderbird 
  - autocrypt-thunderbird plugin should be active


