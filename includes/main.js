var $textarea;
var ok_to_run_demo = true;

var init_textarea = function() {
  $textarea = $(".textarea textarea")
    .focus(function() {
      ok_to_run_demo = false;
      reset_copy_buttons();
      if (!$(this).attr("data-touched")) {
        $(this)
          .attr("data-touched", 1)
          .val("");
        run_all_transforms();
      } else {
        $(this).select();
      }
    })
    .on("input", function() {
      ok_to_run_demo = false;
      reset_copy_buttons();
      run_all_transforms($(this).val());
    });
};

var reset_copy_buttons = function() {
  $(".copy").text(notify_strings.copy);
};

var run_demo = function() {
  var str = hello_text_string.split("");
  for (var i = 1; i <= str.length; i++) {
    (function(pos) {
      setTimeout(function() {
        if (ok_to_run_demo) {
          var text = str.slice(0, pos).join("");
          $textarea.val(text);
          run_all_transforms(text);
        }
      }, 5 * pos * (pos / 3));
    })(i);
  }
};

/**
 * Only operate on elements that actually have data-transform.
 * This prevents errors on the underline span and other non-transform outputs.
 */
var run_all_transforms = function(text) {
  // Clear only elements that use the transform engine
  $(".example .value_inner[data-transform]").text("");

  if (text) {
    $(".example .value_inner[data-transform]").each(function() {
      var $div = $(this);
      var transform = $div.attr("data-transform");
      var t = run_transform(transform, text);
      $div.text(t);
    });
  }
};

/**
 * Safely runs a transform. If the transform key is missing or invalid,
 * returns the original text instead of throwing.
 */
var run_transform = function(transform, text) {
  if (!transform || typeof ts === "undefined" || !ts[transform]) {
    return text;
  }

  var actions = ts[transform];
  for (var i = 0; i < actions.length; i++) {
    var action = actions[i];
    if (action) {
      text = tfs[action.action](text, action);
    }
  }
  return text;
};

var bump_counter = function(type) {
  var key = "_text_" + type + "_count";
  var count = (parseInt(localStorage.getItem(key)) || 0) + 1;
  localStorage.setItem(key, count);
};

var last_counter = function(type) {
  var key = "_text_" + type + "_last";
  var now = new Date().getTime();
  localStorage.setItem(key, now);
};

var notify = function(text) {
  $(".notification")
    .addClass("closed")
    .removeClass("clear");
  setTimeout(function() {
    $(".notification").text(text);
    $(".notification").removeClass("closed");
    setTimeout(function() {
      $(".notification").addClass("clear");
    }, 1000);
  }, 100);
};

var populateClipboardFromLocalstorage = function() {
  var clipboard = localStorage.yt_clipboard
    ? JSON.parse(localStorage.yt_clipboard)
    : [];
  $(".clipboard .history").html("");
  $.each(clipboard, function(i, data) {
    $el = $(
      '<div class="history_item"><div class="text"><div class="copy_button"><i class="far fa-copy"></i></div></div><div class="meta"></div></div>'
    );
    $(".text", $el).append(data.text);
    $(".meta", $el).append(
      new Date(data.date).toLocaleString() + " &mdash; " + data.transform
    );
    $(".clipboard .history").prepend($el);
    var clip = new Clipboard($el.get(0), {
      text: function(trigger) {
        notify(notify_strings.recopied);
        return data.text;
      }
    });
    clip.on("success", function(e) {
      if (typeof ga === "function") {
        ga("send", "event", "Clipboard Action", "copy", data.transform);
      }
    });
  });
  if (!clipboard.length) {
    $(".history").hide();
    $(".clipboard_help").show();
    $(".toggle_clipboard").removeClass("has_clips");
    $(".clipboard-counter").hide();
    $(".toggle_help").hide();
    $(".clear_clipboard_container").hide();
  } else {
    $(".history").show();
    $(".clipboard_help").hide();
    $(".toggle_clipboard").addClass("has_clips");
    $(".clipboard-counter")
      .show()
      .text(clipboard.length);
    $(".toggle_help")
      .show()
      .text("?");
    $(".clear_clipboard_container").show();
  }
};

var init_buttons = function() {
  $(".example").each(function() {
    var $t = $(this);
    var $copy = $(".copy", $t);
    var $tweet = $(".tweet", $t);

    if (!$copy.length) {
      return;
    }

    var clip = new Clipboard($copy.get(0), {
      text: function(trigger) {
        ok_to_run_demo = false;
        var txt = $(".value_inner", $t).text();
        var clipboard = localStorage.yt_clipboard
          ? JSON.parse(localStorage.yt_clipboard)
          : [];
        clipboard.push({
          text: $textarea.val(),
          date: new Date().toISOString(),
          transform: "original"
        });
        clipboard.push({
          text: txt,
          date: new Date().toISOString(),
          transform: $t.data("transform-slug")
        });

        // De-duplicate and limit to last 30
        var _c_index = {};
        var _c = [];
        for (var i = 0; i < clipboard.length; i++) {
          var index = clipboard[i].transform + clipboard[i].text;
          if (_c_index[index] === undefined) {
            _c_index[index] = true;
            _c.push(clipboard[i]);
          }
        }
        clipboard = _c.slice(-30);
        localStorage.yt_clipboard = JSON.stringify(clipboard);
        notify(notify_strings.copied);
        populateClipboardFromLocalstorage();
        return txt;
      }
    });

    clip.on("success", function(e) {
      reset_copy_buttons();
      $copy.text(notify_strings.copied_excl);
      bump_counter("copy");
      if (typeof ga === "function") {
        ga(
          "send",
          "event",
          "Transform Action",
          "copy",
          $t.data("transform-slug")
        );
      }
    });
  });
};

$(function() {
  init_textarea();
  init_buttons();

  $(".toggle_nav").click(function() {
    $("html").toggleClass("show_nav");
  });

  $(".toggle_clipboard").click(function(e) {
    var show = $(".clipboard")
      .toggle()
      .is(":visible");
    if (typeof ga === "function") {
      ga("send", "event", "Clipboard Action", show ? "show" : "hide");
    }
    e.stopPropagation();
  });

  $(document).click(function(e) {
    if ($(e.target).closest($(".clipboard")).length === 0) {
      $(".clipboard").hide();
    }
  });

  $(document).on("keydown", function(e) {
    if (e.keyCode === 27) {
      $(".clipboard").hide();
    }
  });

  $(".clear_clipboard_container").click(function() {
    localStorage.yt_clipboard = "";
    populateClipboardFromLocalstorage();
    notify(notify_strings.emptied_clipboard);
    if (typeof ga === "function") {
      ga("send", "event", "Clipboard Action", "clear");
    }
  });

  $(".toggle_help").click(function() {
    if ($(".clipboard_help").is(":visible")) {
      $(".clipboard_help").hide();
      $(".history").show();
      $(".toggle_help").text("?");
    } else {
      $(".clipboard_help").show();
      $(".history").hide();
      $(".toggle_help").text(notify_strings.show_clipboard);
    }
  });
});
