var redpill = (function($, undefined) {
  'use strict';

  var redpill = function(definitions, generate, lhsInput, rhsInput, solve, output) {
    var self = this;
    self.args = {
      definitions: definitions,
      generate: generate,
      lhsInput: lhsInput,
      rhsInput: rhsInput,
      solve: solve,
      output: output
    };
    solve.prop('disabled', true);
    solve.click(function() {
      self.doSolve();
    });
    generate.click(function() {
      self.doGenerate();
    });
  }

  var Context;

  redpill.prototype.doGenerate = function() {
    var self = this;
    var hasVars = self.generate(self.args.definitions.val(), self.args.lhsInput, self.args.rhsInput);
    self.args.solve.prop('disabled', hasVars === false);
  }

  redpill.prototype.doSolve = function() {
    var self = this;
    var parseOutput = self.eval();
    self.args.output.text(parseOutput);
  }

  redpill.prototype.generate = function(defsText, lhsInput, rhsInput) {
    var self = this;

    if (self._lhsTable === undefined) {
      var actualTable = self._lhsTable = $('<table/>');
      self._lhsTbody = $('<tbody/>');
      self._lhsHead = $('<thead/>');
      actualTable.append(self._lhsHead);
      actualTable.append(self._lhsTbody);
      actualTable.appendTo(lhsInput);
    }
    var lhsTable = self._lhsTbody;

    if (self._rhsTable === undefined) {
      var actualTable = self._rhsTable = $('<table/>');
      self._rhsTbody = $('<tbody/>');
      self._rhsHead = $('<thead/>');
      actualTable.append(self._rhsHead);
      actualTable.append(self._rhsTbody);
      actualTable.appendTo(rhsInput);
    }
    var rhsTable = self._rhsTbody;

    var defs =
      defsText.split('\n')
        .map(function(line) {
          return line.trim();
        })
        .filter(function(line) {
          return line.length != 0;
        }
      );

    var vars = [];
    var consts = [];

    defs.forEach(function(def) {
      vars.push(def);
    });

    self._vars = vars;
    self._context = new Context();

    var ensureTable = function(table, numRow, numCol) {
      var tableLength = table.children().length;
      if (tableLength < numRow) {
        for (var i = tableLength; i < numRow; ++i) {
          $('<tr/>').appendTo(table);
        }
        table.children().each(function() {
          var tr = $(this);
          for (var i = tr.children().length; i < numCol; ++i) {
            tr.append($('<th/>'));
          }
        });
      } else if (tableLength > numRow) {
        table.find('tr').slice(numRow, tableLength).remove();
        table.children().each(function() {
          var tr = $(this);
          tr.find('th').slice(numCol, tableLength).remove();
        });
      }

      var ret = [];
      table.children().each(function() {
        var row = [];
        $(this).children().each(function() {
          row.push(this);
        });
        ret.push(row);
      });
      return ret;
    }

    var generateSingleLineTextbox = function() {
      return $('<textarea/>').addClass('single-line').prop('row', 1);
    }

    {
      var tableArray = ensureTable(lhsTable, vars.length, vars.length);
      self._lhs = tableArray;

      for (var i = 0; i < vars.length; ++i) {
        for (var j = 0; j <= vars.length; ++j) {
          var box = $(tableArray[i][j]);
          if (box.children().length === 0) {
            box.append(generateSingleLineTextbox().addClass('equation-lhs-var'));
          }
        }
      }

      var lhsHead = self._lhsHead;
      lhsHead.children().remove();
      for (var i = 0; i < vars.length; ++i) {
        var head = $('<th/>').addClass('var-id').text(vars[i]);
        lhsHead.append(head);
      }
    }

    {
      var tableArray = ensureTable(rhsTable, vars.length, 1);
      self._rhs = tableArray;

      for (var i = 0; i < vars.length; ++i) {
        var box = $(tableArray[i][0]);
        if (box.children().length === 0) {
          box.append($('<div/>').addClass('equals').text('=')).append(generateSingleLineTextbox().addClass('equation-rhs'));
        }
      }

      var rhsHead = self._rhsHead;
      rhsHead.children().remove();
      if (vars.length != 0) {
        rhsHead.append($('<th/>').text('value'));
      }
    }

    return vars.length !== 0;
  }

  redpill.prototype.eval = function() {
    var self = this;
    var lhsInput = self._lhs;
    var rhsInput = self._rhs;

    var context = self._context;

    var lhsCoefficients = [];
    for (var i = 0; i < lhsInput.length; ++i) {
      var row = [];
      for (var j = 0; j < lhsInput[i].length; ++j) {
        var str = $(lhsInput[i][j]).find('.equation-lhs-var').first().val();
        if (!str) {
          row.push(0);
        } else {
          var parsedValue;
          try {
            parsedValue = Shunt.parse(str, context);
          } catch (err) {
            // show error
          }
          if (parsedValue !== undefined) {
            row.push(parsedValue);
          }
        }
      }
      lhsCoefficients.push(row);
    }

    var rhsCoefficients = [];
    for (var i = 0; i < rhsInput.length; ++i) {
      var str = $(rhsInput[i]).find('.equation-rhs').first().val();
      if (!str) {
        rhsCoefficients.push(0);
      } else {
        rhsCoefficients.push(parseFloat(str));
      }
    }
    self.solveMatrix(lhsCoefficients, rhsCoefficients, function(solns) {
      var vars = self._vars;
      var outText = '';
      for (var i = 0; i < vars.length; ++i) {
        outText += vars[i] + ' = ' + solns[i] + '\n';
      }
      self.args.output.text(outText);
    }, function() {
      self.args.output.text('Could not find unique solutions for all variables given the equations.');
    });
  }

  function prnt(m) {
    console.log('BEGIN');
    for (var i = 0; i < m.length; ++i) {
      for (var j = 0; j < m[i].length; ++j) {
        console.log(m[i][j]);
      }
    }
    console.log('END');
  }

  redpill.prototype.solveMatrix = function(matrix, vector, done, err) {
    var doGaussianElimination = function(m, v) {
      var m = matrix;
      var v = vector;
      var len = v.length;
      for (var p = 0; p < len; ++p) {
        var max = p;
        for (var i = p + 1; i < len; ++i) {
          if (Math.abs(m[i][p]) > Math.abs(m[max][p])) {
            max = i;
          }
        }
        var temp = m[p];m[p] = m[max];m[max] = temp;
        var t = v[p];v[p] = v[max];v[max] = t;
        if (Math.abs(m[p][p]) <= 1e-10) {
          err();
          return;
        }
        for (var i = p + 1; i < len; ++i)
        {
          var alpha = m[i][p] / m[p][p];
          v[i] -= alpha * v[p];
          for (var j = p; j < len; ++j) {
            m[i][j] -= alpha * m[p][j];
          }
        }
      }
      var x = Array(len);
      for (i = 0; i < len; ++i) {
        x[i] = 0;
      }
      for (var i = len - 1; i >= 0; --i)
      {
        var sum = 0;
        for (var j = i + 1; j < len; ++j) {
          sum += m[i][j] * x[j];
        }
        x[i] = ((v[i] - sum) / m[i][i]);
      }
      done(x);
    }

    doGaussianElimination(matrix, vector);
  }

  redpill.prototype.getLHSInputs = function() {
    return this._lhs;
  }

  redpill.prototype.getRHSInputs = function() {
    return this._rhs;
  }

  Context = function() {
    Shunt.Context.call(this);
    applyDefaultDefines(this);
  }
  Context.prototype = Object.create(Shunt.Context.prototype);
  Context.prototype.constructor = Context;

  var defaultDefines = [
    ['min', Math.min],
    ['max', Math.max],
    ['ceil', Math.ceil],
    ['floor', Math.floor],
    ['abs', Math.abs],
    ['acos', Math.acos],
    ['asin', Math.asin],
    ['atan', Math.atan],
    ['atan2', Math.atan2],
    ['cos', Math.cos],
    ['exp', Math.exp],
    ['log', Math.log],
    ['ln', Math.log],
    ['pow', Math.pow],
    ['sin', Math.sin],
    ['sqrt', Math.sqrt],
    ['tan', Math.tan],

    ['e', Math.E],
    ['pi', Math.PI],
  ];
  function applyDefaultDefines(context) {
    defaultDefines.forEach(function(def) {
      context.def(def[0], def[1]);
    });
  }

  return redpill;
})(jQuery);
