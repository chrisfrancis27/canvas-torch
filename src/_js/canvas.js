/*global YUI, console, Image */
/*jslint undef: true, nomen: true, eqeqeq: true, plusplus: true, bitwise: true, regexp: true, strict: true, newcap: true, immed: true */
"use strict";

YUI().add('canvas', function(Y) {
    function Canvas(config) {
        Canvas.superclass.constructor.apply(this, arguments);
    }

    Canvas.NAME = "canvas";

    Canvas.ATTRS = {
		spotlightRadius: {
			value: 100,
			validator: Y.Lang.isNumber
		},
		ambientDarkness: {
			value: 0.5,
			validator: Y.Lang.isNumber
		},
		canvasWidth: {
			value: 300,
			validator: Y.Lang.isNumber
		},
		canvasHeight: {
			value: 150,
			validator: Y.Lang.isNumber
		},
		backgroundImgSrc: {
			value: null
		},
		foregroundImgSrc: {
			value: null
		}
	};

    Y.extend(Canvas, Y.Widget, {

		// Initialise properties
		mouseX: 0,
		mouseY: 0,

        renderUI: function() {
			var scope = this;
			
			// Append canvas element to DOM inside contentBox
			this.contentBox = this.get('contentBox');
			this.canvasWidth = this.get('canvasWidth');
			this.canvasHeight = this.get('canvasHeight');
			this.contentBox.append('<canvas id="displayCanvas" width="' + this.canvasWidth + '" height="' + this.canvasHeight + '"></canvas>');
			this.canvasNode = this.contentBox.one('#displayCanvas');
			this.canvas = Y.Node.getDOMNode(this.canvasNode);
			this.ctx = this.canvas.getContext('2d');
			
			// Append hidden canvas to DOM outside viewport
			var radius = this.get('spotlightRadius');
			this.spotlightCirc = radius * 2;
			Y.one('body').append('<canvas id="hiddenCanvas" width="' + this.spotlightCirc + '" height="' + this.spotlightCirc + '" style="position:absolute;top:-' + this.spotlightCirc + 'px"></canvas>');
			this.hiddenCanvasNode = Y.one('#hiddenCanvas');
			this.hiddenCanvas = Y.Node.getDOMNode(this.hiddenCanvasNode);
			this.hiddenCtx = this.hiddenCanvas.getContext('2d');
			
			// Precalc the spotlight effect
			var radgrad = this.hiddenCtx.createRadialGradient(radius, radius, 10, radius, radius, radius);  
			radgrad.addColorStop(0, 'rgba(10,10,10,0)');
			radgrad.addColorStop(1, 'rgba(0,0,0,' + this.get('ambientDarkness') + ')');
			this.hiddenCtx.fillStyle = radgrad;  
			this.hiddenCtx.fillRect(0,0,this.spotlightCirc,this.spotlightCirc);
			var spotlightBase64 = this.hiddenCanvas.toDataURL('image/png');
			this.spotlight = new Image();
			this.spotlight.src = spotlightBase64;

			// Precalc the foreground object & shadow
			this.foregroundImg = new Image();
			this.foregroundImg.src = this.get('foregroundImgSrc');
			
			// Request background image via AJAX
			this.backgroundImg = new Image();
			this.backgroundImg.onload = function() {
				// Continue rendering
				scope.drawCanvas();
				// Tile it!
				scope.tileBackground();
			};
			this.backgroundImg.src = this.get('backgroundImgSrc');
		},
        
        bindUI: function() {
			// Register mouse move listener
			var scope = this;
			Y.on('mousemove', function(e){
				scope.mouseX = e.clientX;
				scope.mouseY = e.clientY;
			});
			
			// Kick off the updateFrame method
			Y.later(50, this, this.updateFrame, null, false);
		},
		
		updateFrame: function() {
			// Clear canvas
			this.ctx.clearRect(0,0,this.canvasWidth,this.canvasHeight);
			
			// Redraw canvas
			this.drawCanvas();
			this.tileBackground();

			// Do it again in 20ms
			Y.later(20, this, this.updateFrame, null, false);
		},
        
        drawCanvas: function() {
			var radius = this.get('spotlightRadius');
			
			// Save initial state
			this.ctx.save();
			this.ctx.globalCompositeOperation = 'destination-over';
			
			// Draw a partially opaque rectangle over the whole canvas
			this.ctx.fillStyle = 'rgba(0,0,0,' + this.get('ambientDarkness') + ')';  
			this.ctx.fillRect(0,0,this.canvasWidth,this.canvasHeight);
			
			// Clear a space in the opaque rectangle for the spotlight image
			this.ctx.clearRect(this.mouseX - radius, this.mouseY - radius, radius * 2, radius * 2);
			
			// Draw the foreground image (once without shadow and once with, else shadow appears in front)
			this.ctx.drawImage(this.foregroundImg, 400, 100);
			var distanceX = 465 - this.mouseX;
			var distanceY = 164 - this.mouseY;
			var distance = Math.sqrt((distanceX * distanceX) + (distanceY * distanceY));
			distance = (distance < 0) ? -(distance) : distance;
			var offsetX = (distanceX !== 0) ? distanceX / 10 : distanceX;
			var offsetY = (distanceY !== 0) ? distanceY / 10 : distanceY;
			var alpha = 0.1;
			var blur = 100;
			if (distance <= this.spotlightCirc) {
				alpha += (this.spotlightCirc - distance) / this.spotlightCirc;
				blur -= ((this.spotlightCirc - distance) / this.spotlightCirc) * 100;
			}
			this.ctx.shadowColor = 'rgba(0,0,0,' + alpha + ')';
			this.ctx.shadowOffsetX = offsetX;
			this.ctx.shadowOffsetY = offsetY;
			this.ctx.shadowBlur = blur;
			this.ctx.drawImage(this.foregroundImg, 400, 100);
			this.ctx.restore();

			// Render spotlight to canvas
			this.ctx.drawImage(this.spotlight, this.mouseX - radius, this.mouseY - radius);
		},
		
		tileBackground: function() {
			// Save initial state
			this.ctx.save();
			this.ctx.globalCompositeOperation = 'destination-over';
			
			// Loop through each column
			for (var iX = 0; iX < this.canvasWidth; iX += this.backgroundImg.width)
			{
				// Loop through each row
				for (var iY = 0; iY < this.canvasHeight; iY += this.backgroundImg.height)
				{
					this.ctx.drawImage(this.backgroundImg, iX, iY);
				}
			}
			
			// Restore previous state
			this.ctx.restore();
		}
    });

    Y.namespace('TwoAndaHalfPeople').Canvas = Canvas;

}, '1.0.0', { requires: ['widget', 'io-base', 'profiler', 'async-queue'] });
