# autocrypt-thunderbird

WIP Experiment, extension for Autocrypt in Thunderbird

## installing in development mode 

You need Thunderbird 52. 

```
$ git clone git@github.com:karissa/autocrypt-thunderbird.git
$ cd autocrypt-thunderbird
$ npm install
```

Then link your/a Thunderbird profile with the autocrypt-thunderbird extension:

- Use Mozilla's [extension installation
  instruction](https://developer.mozilla.org/en-US/docs/Mozilla/Thunderbird/Thunderbird_extensions/Building_a_Thunderbird_extension_7:_Installation). 
  - Where you create "the file to reference your extension files", use "autocrypt@autocrypt.org" as the filename, and put in a single line that is the path to the directory of your checkout of autocrypt-thunderbird. This is covered in the link above.

Initially and after any change you need to run `npm run build` and restart thunderbird. It could be reloaded automatically if someone is able to implement [this issue](https://github.com/karissa/autocrypt-thunderbird/issues/2) 

# Note

Uses some coe from Enigmail.

# License

GPL
