var redpill = (function($, undefined) {
  'use strict';

  var redpill = function(definitions, generate, lhsInput, rhsInput, solve, output) {
    var self = this;
    solve.prop('disabled', true);
    solve.click(function() {
      var parseOutput = self.eval();
      output.text(parseOutput);
    });
    generate.click(function() {
      var hasVars = self.generate(definitions.val(), lhsInput, rhsInput);
      solve.prop('disabled', hasVars === false);
    });
  }

  var Context;

  redpill.prototype.generate = function(defsText, lhsInput, rhsInput) {
    var self = this;

    if (self._lhsTable === undefined) {
      var actualTable = self._lhsTable = $('<table/>');
      self._lhsTbody = $('<tbody/>');
      actualTable.append(self._lhsTbody);
      actualTable.appendTo(lhsInput);
    }
    var lhsTable = self._lhsTbody;

    if (self._rhsTable === undefined) {
      var actualTable = self._rhsTable = $('<table/>');
      self._rhsTbody = $('<tbody/>');
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
      this._lhs = tableArray;

      for (var i = 0; i < vars.length; ++i) {
        for (var j = 0; j <= vars.length; ++j) {
          var box = $(tableArray[i][j]);
          if (box.children().length === 0) {
            box.append(generateSingleLineTextbox());
          }
        }
      }
    }

    {
      var tableArray = ensureTable(rhsTable, vars.length, 1);
      for (var i = 0; i < vars.length; ++i) {
        var box = $(tableArray[i][0]);
        if (box.children().length === 0) {
          box.append($('<div/>').addClass('equals').text('=')).append(generateSingleLineTextbox());
        }
      }
    }

    return vars.length !== 0;
  }

  redpill.prototype.eval = function() {
    var self = this;
    var lhsInput = self._lhs;
    var rhsInput = self._rhs;

    var context = new Context();
    return Shunt.parse('pi', context);
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
