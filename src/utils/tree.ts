function makePrefix(key: any, last: any) {
  var str = last ? "└" : "├";
  if (key) {
    str += "─ ";
  } else {
    str += "──┐";
  }
  return str;
}

function filterKeys(
  obj: { [x: string]: any; hasOwnProperty: (arg0: string) => any },
  hideFunctions: any
) {
  var keys = [];
  for (var branch in obj) {
    // always exclude anything in the object's prototype
    if (!obj.hasOwnProperty(branch)) {
      continue;
    }
    // ... and hide any keys mapped to functions if we've been told to
    if (hideFunctions && typeof obj[branch] === "function") {
      continue;
    }
    keys.push(branch);
  }
  return keys;
}

function growBranch(
  key: string,
  root: string,
  last: boolean,
  lastStates: any[],
  showValues: any,
  hideFunctions: any,
  callback: { (line: any): void; (arg0: string): void }
) {
  var line = "",
    index = 0,
    lastKey,
    circular: boolean = false,
    lastStatesCopy = lastStates.slice(0);

  if (lastStatesCopy.push([root, last]) && lastStates.length > 0) {
    // based on the "was last element" states of whatever we're nested within,
    // we need to append either blankness or a branch to our line
    lastStates.forEach((lastState: any[], idx: number) => {
      if (idx > 0) {
        line += (lastState[1] ? " " : "│") + "  ";
      }
      if (!circular && lastState[0] === root) {
        circular = true;
      }
    });

    // the prefix varies based on whether the key contains something to show and
    // whether we're dealing with the last element in this collection
    line += makePrefix(key, last) + key;

    // append values and the circular reference indicator
    showValues && typeof root !== "object" && (line += ": " + root);
    circular && (line += " (circular ref.)");

    callback(line);
  }

  // can we descend into the next item?
  if (!circular && typeof root === "object") {
    var keys = filterKeys(root, hideFunctions);
    keys.forEach(function (branch) {
      // the last key is always printed with a different prefix, so we'll need to know if we have it
      lastKey = ++index === keys.length;

      // hold your breath for recursive action
      growBranch(
        branch,
        root[branch],
        lastKey,
        lastStatesCopy,
        showValues,
        hideFunctions,
        callback
      );
    });
  }
}

// asLines
// --------------------
// Outputs the tree line-by-line, calling the lineCallback when each one is available.

export const asLines = function (
  obj: any,
  showValues: any,
  hideFunctions: any,
  lineCallback: any
) {
  /* hideFunctions and lineCallback are curried, which means we don't break apps using the older form */
  var hideFunctionsArg =
    typeof hideFunctions !== "function" ? hideFunctions : false;
  growBranch(
    ".",
    obj,
    false,
    [],
    showValues,
    hideFunctionsArg,
    lineCallback || hideFunctions
  );
};

// asTree
// --------------------
// Outputs the entire tree, returning it as a string with line breaks.

export const asTree = function (
  obj: any,
  showValues?: any,
  hideFunctions?: any
) {
  var tree = "";
  growBranch(".", obj, false, [], showValues, hideFunctions, function (
    line: string
  ) {
    tree += line + "\n";
  });
  return tree;
};
