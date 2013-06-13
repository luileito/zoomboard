(function(global, undefined) {

  var specialKeys = {
    ENTER: "enter"
    , DELETE: "delete"
    , SPACE: " "
  };
  
  var zb = {

    options: {
      img_srcs: ["ZoomBoard3b.png", "symbols3b.png"]
      // The key mappings are defined in keys.js
      , keymaps: [keys, keys_sym]
      , keyboard_names: ["ZB", "#"]
      // A character is printed when scale_factor * current_zoom > max_zoom
      , zoom_factor: 2.2
      // This is the initial scale of the keyboard layout
      , original_scale: 0.12
      // If max_zoom > 1 then the original image will be oversampled
      , max_zoom: 1.0
      , reset_on_max_zoom: true
      // This is in ms
      , reset_timeout: 1000
      // This is in px
      , center_bias: 0.05
      // This is in seconds
      , anim_time: 0.1
      // These are in px
      , min_swipe_x: 40
      , min_swipe_y: 30
      , max_key_error_distance: 2
      // This allows a regular keyboard to be used in desktop browsers
      , use_real_keyboard: true
    }

    , cursorPos: function(event) {
      var x, y, e = event.originalEvent;
      if (e.changedTouches) e = e.changedTouches[0];
      return {
          x: e.pageX
        , y: e.pageY
      };
    }
          
    , _create: function() {
      var self = this;
      
      $.Widget.prototype._create.call(this);
      this.original_position = {
        x: 0, y: 0, width: 0, height: 0
      };
      this.original_dimensions = {width:0, height:0};
      this.img = $("<img />")
                  .appendTo(this.element)
                  .css({
                    position: "absolute"
                    , left: "0px"
                    , top: "0px"
                    , "pointer-events": "none"
                    , "-webkit-transition": "all " + this.option("anim_time") + "s ease-out"
                  })
                  .on("load", function(event) {
                    self.original_dimensions.width = self.img[0]["naturalWidth"];
                    self.original_dimensions.height = self.img[0]["naturalHeight"];

                    var window_dimensions = self.get_window_dimensions();

                    self.element.css({
                      width: window_dimensions.width+"px"
                      , height: window_dimensions.height+"px"
                    });

                    self.overlay.css("font-size", (Math.min(window_dimensions.width, window_dimensions.height)/1.2)+"px");
                    self.reset();
                  });
      
      this.img.on("load", $.proxy(function(event) {
        global.setTimeout($.proxy(function() {
          this.overlay.css("font-size", (this.img.height()/1.2)+"px");
        }, this), 500);
      }, this));
      
      this.overlay = $("<div />")
                      .appendTo(this.element)
                      .addClass("overlay")
                      .css({
                        "height": "100%"
                        , "width": "100%"
                        , "position": "absolute"
                        , "pointer-events": "none"
                        , "-webkit-transition": "opacity 0.2s ease-in-out"
                        , "color": "white"
                        , "text-align": "center"
                        , "font-size": (this.img.height()/1.2)+"px"
                        , "text-shadow": "0px 0px 4px #000"
                        , "background-color": "rgba(0,0,0,0.4)"
                        , "font-family": '"HelveticaNeue-Light", "Helvetica Neue Light", "Helvetica Neue", Helvetica, Arial, "Lucida Grande", sans-serif'
                        , "opacity": 0
                        , "text-transform": "capitalize"
                        , "line-height": "normal"
                      });
      
      this.element.css({
        position: "relative"
        , overflow: "hidden"
      });
      
      this.element.on("touchstart.zoomboard_swipe mousedown.zoomboard_swipe", function(event) {
        var is_moving = false;
        if (self.in_starting_position) {
          is_moving = true;
          var start = self.cursorPos(event);
                  
          var remove_event_handlers = function() {
            is_moving = false;
            self.element.off("touchmove.zb_swipe touchend.zb_swipe mousemove.zb_swipe mouseup.zb_swipe");
          };
          
          self.element.on("touchmove.zb_swipe mousemove.zb_swipe", function(event) {
            if (is_moving === true) {
              var end = self.cursorPos(event);
              var dx = start.x - end.x;
              var dy = start.y - end.y;
              if (Math.abs(dx) >= self.option("min_swipe_x")) {
                if (dx > 0) {
                  self.on_swipe("left");
                  remove_event_handlers();
                  self.just_gestured = true;
                } else {
                  self.on_swipe("right");
                  remove_event_handlers();
                  self.just_gestured = true;
                }
              } else if (Math.abs(dy) >= self.option("min_swipe_y")) {
                if (dy > 0) {
                  self.on_swipe("up");
                  remove_event_handlers();
                  self.just_gestured = true;
                } else {
                  self.on_swipe("down");
                  remove_event_handlers();
                  self.just_gestured = true;
                }
              }
            }
          });
          
          self.element.on("touchend.zb_swipe mouseup.zb_swipe", function() {
            remove_event_handlers();
          });
        }
      });
      
      this.element.on("touchstart.zoomboard mousedown.zoomboard", _.bind(this.on_element_click, this));

      if (this.option("use_real_keyboard")) {
        $(global).on("keydown.zoomboard", function(event) {
          event.preventDefault();
          if (event.keyCode === 37) { //left
            self.on_swipe("left");
          } else if (event.keyCode === 39) { //right
            self.on_swipe("right");
          } else if (event.keyCode === 38) { //up
            self.on_swipe("up");
          } else if (event.keyCode === 40) { //down
            self.on_swipe("down");
          } else {
            var zoomkey_event = jQuery.Event("zb_key");
            zoomkey_event.key = String.fromCharCode(event.keyCode).toLowerCase();
            if (event.keyCode === 8) {
              event.returnValue = false;
              event.cancelBubble = true;
              zoomkey_event.key = specialKeys.DELETE;
            } else if (event.keyCode === 13) { //return
              zoomkey_event.key = specialKeys.ENTER;
            }
            zoomkey_event.entry_type = "keyboard_press";
            self.flashkey(zoomkey_event.key);
            if (self.is_printable(event) || [8, 13].indexOf(event.keyCode) > -1) {
              self.element.trigger(zoomkey_event);
            }
          }
        });
      }
      
      this.reset_timeout = undefined;
      this.set_keyboard_index(0);
      this.in_starting_position = true;
      this.just_gestured = false;
    }
      
    , destroy: function() {
      this.img.remove();
      this.element.css({
        position: ""
        , overflow: ""
      });
      this.element.off("touchstart.zoomboard mousedown.zoomboard");
      if (this.option("use_real_keyboard")) {
        $(global).off("keydown.zoomboard");
      }
      $.Widget.prototype.destroy.call(this);
    }
    
    , is_printable: function(event) {
      if (typeof event.which == "undefined") {
        return true;
      } else if (typeof event.which == "number" && event.which > 0) {
        return event.which == 32 || event.which == 13 || event.which > 46;
      }
      return false;
    }
    
    , set_keyboard_index: function(index) {
      var img_src = this.option("img_srcs")[index];
      var keymap = this.option("keymaps")[index];
      var keyboard_name = this.option("keyboard_names")[index];

      this.img.attr("src", img_src);
      this.keymap = keymap;
      this.keyboard_index = index;
      this.flash(keyboard_name, 500, "#7A9FC4");
    }
    
    , get_keyboard_index: function() {
      return this.keyboard_index;
    }
    
    , get_num_keyboards: function() {
      return this.option("img_srcs").length;
    }
    
    , on_swipe: function(direction) {
      var zoomswipe_event = jQuery.Event("zb_swipe");
      zoomswipe_event.direction = direction;
      this.element.trigger(zoomswipe_event);
      this.reset(false);

      if (direction === "left") {
        var zoomkey_event = jQuery.Event("zb_key");
        zoomkey_event.key = specialKeys.DELETE;
        zoomkey_event.entry_type = "swipe";
        this.element.trigger(zoomkey_event);
        this.flashkey(zoomkey_event.key);
      } else if (direction === "right") {
        var zoomkey_event = jQuery.Event("zb_key");
        zoomkey_event.key = specialKeys.SPACE;
        zoomkey_event.entry_type = "swipe";
        this.element.trigger(zoomkey_event);
        this.flashkey(zoomkey_event.key);
      } else if (direction === "up") {
        var keyboard_index = this.get_keyboard_index();
        var num_keyboards = this.get_num_keyboards();
        keyboard_index++;
        if (keyboard_index >= num_keyboards) {
          keyboard_index = 0;
        }
        this.set_keyboard_index(keyboard_index);
      } else if (direction === "down") {
        var keyboard_index = this.get_keyboard_index();
        keyboard_index--;
        if (keyboard_index < 0) {
          var num_keyboards = this.get_num_keyboards();
          keyboard_index = num_keyboards-1;
        }
        this.set_keyboard_index(keyboard_index);
      }
    }
    
    , on_element_click: function(event) {
      event.preventDefault();
      //event.stopPropagation();

      var current_zoom_x = this.get_x_zoom();
      var current_zoom_y = this.get_y_zoom();
      var current_zoom = this.get_zoom();
      var scale_factor = this.option("zoom_factor");
      var center_bias  = this.option("center_bias");
      var max_zoom     = this.option("max_zoom");

      var do_zoom = $.proxy(function(x, y) {
        var zoomtouch_event = jQuery.Event("zb_zoom");
        zoomtouch_event.x = x; 
        zoomtouch_event.y = y;
        this.element.trigger(zoomtouch_event);

        if (scale_factor * current_zoom > max_zoom) {
          var key = this.get_key_for_point({x:x, y:y});
          if (key !== null) {
            var zoomkey_event = jQuery.Event("zb_key");
            zoomkey_event.key = key.key;
            zoomkey_event.entry_type = "press";
            this.element.trigger(zoomkey_event);
            this.flashkey(zoomkey_event.key);
          }
          this.reset();
          return;
        } else {
          this.in_starting_position = false;

          var new_viewport_width = this.viewport.width / scale_factor;
          var new_viewport_height = this.viewport.height / scale_factor;

          var centered_x = x - new_viewport_width/2;
          var centered_y = y - new_viewport_height/2;

          var biased_viewport_x = x - (new_viewport_width * (x - this.viewport.x)) / this.viewport.width;
          var biased_viewport_y = y - (new_viewport_height * (y - this.viewport.y)) / this.viewport.height;

          this.set_viewport({
            width: new_viewport_width
            , height: new_viewport_height
            , x: biased_viewport_x * (1 - center_bias) + centered_x * center_bias
            , y: biased_viewport_y * (1 - center_bias) + centered_y * center_bias
          });
        }
      }, this);

      this.clear_reset_timeout();
      
      $(this.element).one("touchend mouseup", $.proxy(function(event) {
        event.preventDefault();
        if (this.just_gestured === true) {
          this.just_gestured = false;
          return;
        }
        if (event.originalEvent.touches) {
          var pos = this.cursorPos(event);
          var offset = this.element.offset();
          x = pos.x - offset.left;
          y = pos.y - offset.top;
        } else {
          x = event.offsetX;
          y = event.offsetY;
        }
        var x = x / current_zoom_x + this.viewport.x;
        var y = y / current_zoom_y + this.viewport.y;
        do_zoom(x, y);
        this.reset_reset_timeout();
      }, this));
    }
    
    , set_viewport: function(viewport, animated) {
      var window_dimensions = this.get_window_dimensions();

      var scale_x = window_dimensions.width / viewport.width;
      var scale_y = window_dimensions.height / viewport.height;
      
      var width = scale_x * this.original_dimensions.width;
      var height = scale_y * this.original_dimensions.height;

      var x = - viewport.x * scale_x;
      var y = - viewport.y * scale_y;
      
      this.set_position({
        x: x, y: y, width: width, height: height
      }, animated);
      this.viewport = viewport;
    }
    
    , get_window_dimensions: function() {
      var original_scale = this.option("original_scale");
      return {
        width: this.original_dimensions.width * original_scale 
        , height: this.original_dimensions.height * original_scale 
      };
    }
    
    , set_position: function(position, animated) {
      if (animated === false) {
        this.img.css("-webkit-transition", "none");
        this.img.css("-webkit-transition", "all 0.001s ease-out");
      }
      this.img.css({
        left: position.x+"px"
        , top: position.y+"px"
        , width: position.width+"px"
        , height: position.height+"px"
      });
      this.position = position;
      if (animated === false) {
        this.img.css("-webkit-transition", "all " + this.option("anim_time") + "s ease-out");
      }
    }
    
    , reset: function(animated) {
      this.set_viewport({
        x: 0, y: 0, width: this.original_dimensions.width, height: this.original_dimensions.height
      }, animated === true);
      this.clear_reset_timeout();
      this.in_starting_position = true;
    }
    
    , get_center_of_position: function(position) {
      return {x: position.x + position.width/2, y: position.y + position.height/2};
    }
    
    , get_x_zoom: function() {
      return this.position.width / this.original_dimensions.width;
    }
    
    , get_y_zoom: function() {
      return this.position.height / this.original_dimensions.height;
    }
    
    , get_zoom: function() {
      return Math.max(this.get_x_zoom(), this.get_y_zoom());
    }
    
    , get_key_for_point:  function(point) {
      var keys = this.keymap;
      var min_distance = false, min_distance_key = null;
      var max_key_error_distance_squared = Math.pow(this.option("max_key_error_distance"), 2);
      for (var i = 0, len = keys.length; i < len; i++) {
        var key = keys[i];
        if (key.x <= point.x && key.y <= point.y && key.x+key.width >= point.x && key.y + key.height >= point.y) {
          return key;
        } else {
          var key_center_x = key.x + key.width/2;
          var key_center_y = key.y + key.height/2;
          var dx = point.x - key_center_x;
          var dy = point.y - key_center_y;
          var dsquared = Math.pow(dx, 2) + Math.pow(dy, 2);
          if ((min_distance_key === null || dsquared < min_distance) && dsquared < max_key_error_distance_squared * Math.pow(Math.min(key.width, key.height), 2)) {
            min_distance = dsquared;
            min_distance_key = key;
          }
        }
      }
      return min_distance_key;
    }
    
    , clear_reset_timeout: function() {
      if (this.reset_timeout !== undefined) {
        window.clearTimeout(this.reset_timeout);
      }
      this.reset_timeout = undefined;
    }
    
    , reset_reset_timeout: function() {
      this.clear_reset_timeout();
      var reset_timeout = this.option("reset_timeout");
      this.reset_timeout = window.setTimeout(_.bind(this.reset, this), reset_timeout);
    }
    
    , flash: function(text, duration, color) {
      duration = duration || 250;
      color = color || "white";
      window.clearTimeout(this.flash_timeout);
      this.overlay.css({
        "opacity": 0.95
        , "color": color
      }).html(text);
      this.flash_timeout = window.setTimeout($.proxy(function() {
        this.overlay.css("opacity", 0);
      }, this), duration);
    }
    
    , flashkey: function(key) {
      switch (key) {
        case specialKeys.DELETE:
          this.flash("&#8656;");
          break;
        case specialKeys.ENTER:
          this.flash("&#8629;");
          break;
        case specialKeys.SPACE:
          this.flash("&#9251;");
          break;
        default:
          this.flash(key);
          break;
      }
    }
  };

  $.widget("ui.zoomboard", zb);
  
}(this));
