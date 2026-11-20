'use strict';
// Performance page script (T-01-PERF-01). No messages, no storage, no other windows, no network of its own.
(function () {
	var DURATION_MS = 60000;
	var COLD_RUNS = 5;
	var BOOT_WAIT_MS = 30000;
	var params = new URLSearchParams(window.location.search);
	var srcParam = params.get('src') || 'index.html';
	var frame = document.getElementById('game');
	var statusEl = document.getElementById('status');
	var sizeSel = document.getElementById('size');
	var startBtn = document.getElementById('start');
	var coldBtn = document.getElementById('cold');
	var reloadBtn = document.getElementById('reload');
	var bodyEl = document.getElementById('results-body');
	var textEl = document.getElementById('results-text');

	var NA_NOT_RUN = 'not available: not run in this session';
	// key, label, unit. The order is the table order.
	var FIELDS = [
		['env_chrome', 'Chrome version (from navigator.userAgent)', ''],
		['env_window', 'Window innerWidth x innerHeight', 'CSS px'],
		['env_dpr', 'devicePixelRatio', ''],
		['env_frame', 'Frame size', 'CSS px'],
		['raf_frames', 'rAF frames counted in the 60 s', 'frames'],
		['raf_median_ms', 'rAF interval, median', 'ms'],
		['raf_p95_ms', 'rAF interval, p95', 'ms'],
		['raf_p99_ms', 'rAF interval, p99', 'ms'],
		['raf_over_33_3_count', 'rAF intervals above 33.3 ms', 'count'],
		['raf_stalls_over_500_count', 'rAF stalls above 500 ms', 'count'],
		['longtask_over_100_count', 'Long tasks above 100 ms', 'count'],
		['longtask_longest_ms', 'Longest long task', 'ms'],
		['step_us_samples', 'Step time samples from fv:tick', 'values'],
		['step_us_p95', 'Per-tick step time, p95', 'us'],
		['step_us_p99', 'Per-tick step time, p99', 'us'],
		['peak_heap_mb', 'Peak JS heap (approximate, Chrome only; sampled once a second)', 'MB'],
		['transferred_bytes', 'Transferred bytes (frame navigation plus resource entries)', 'bytes'],
		['cold_load_basis', 'Cold load and reload measure up to', ''],
		['cold_load_1_ms', 'Cold load 1', 'ms'],
		['cold_load_2_ms', 'Cold load 2', 'ms'],
		['cold_load_3_ms', 'Cold load 3', 'ms'],
		['cold_load_4_ms', 'Cold load 4', 'ms'],
		['cold_load_5_ms', 'Cold load 5', 'ms'],
		['cold_load_median_ms', 'Cold load, median of 5', 'ms'],
		['reload_ms', 'Reload (location.reload of the frame)', 'ms'],
		['env_screen', 'screen.width x screen.height', 'CSS px'],
		['env_time_utc', 'Measurement time (UTC)', ''],
		['heap_used_start_mb', 'JS heap used at the start of the 60 s', 'MB'],
		['heap_used_end_mb', 'JS heap used at the end of the 60 s', 'MB'],
		['heap_limit_mb', 'JS heap size limit', 'MB'],
		['net_effective_type', 'Network effective type (navigator.connection)', ''],
		['net_downlink_mbps', 'Network downlink estimate', 'Mbit/s'],
		['net_rtt_ms', 'Network round-trip estimate', 'ms'],
		['cold_load_p95_ms', 'Cold load, p95 of 5', 'ms'],
		['memory_note', 'Memory reading to take by hand', '']
	];
	var MEMORY_NOTE = 'Read the ChromeOS Task Manager (Search+Esc) memory footprint for this tab at load, after 60 s and after 5 min; the JS heap above excludes wasm memory and the GPU process';
	var NA_MEM = 'not available: performance.memory is missing (Chrome only)';
	var NA_CONN = 'not available: navigator.connection is missing';
	var results = {};
	window.__fvPerfResults = results;
	window.__fvPerfState = { measuring: false, measureDone: false, coldRunning: false, coldDone: false, frameLoaded: false, bootSeen: false };
	var state = window.__fvPerfState;

	// Set while a measurement or timed load wants the frame's console lines.
	var lineHandler = null;

	function setStatus(text) {
		statusEl.textContent = text;
	}

	function fmt(v) {
		if (typeof v === 'number') {
			return String(Math.round(v * 100) / 100);
		}
		return String(v);
	}

	function heapMb(field) {
		if (performance.memory && typeof performance.memory[field] === 'number') {
			return performance.memory[field] / 1048576;
		}
		return NA_MEM;
	}

	function connField(name) {
		var c = navigator.connection;
		if (!c) {
			return NA_CONN;
		}
		var v = c[name];
		if (typeof v === 'number' ? !isFinite(v) : typeof v !== 'string' || v === '') {
			return 'not available: navigator.connection.' + name + ' is missing';
		}
		return v;
	}

	function setRenderTime() {
		results.env_time_utc = new Date().toISOString();
		results.net_effective_type = connField('effectiveType');
		results.net_downlink_mbps = connField('downlink');
		results.net_rtt_ms = connField('rtt');
		results.heap_limit_mb = heapMb('jsHeapSizeLimit');
		results.memory_note = MEMORY_NOTE;
	}

	function render() {
		var lines = [];
		setRenderTime();
		bodyEl.textContent = '';
		FIELDS.forEach(function (f) {
			if (!Object.prototype.hasOwnProperty.call(results, f[0])) {
				results[f[0]] = NA_NOT_RUN;
			}
			var v = results[f[0]];
			var tr = document.createElement('tr');
			var a = document.createElement('td');
			var b = document.createElement('td');
			var c = document.createElement('td');
			a.textContent = f[1];
			b.textContent = fmt(v);
			b.className = 'num';
			c.textContent = f[2];
			tr.appendChild(a);
			tr.appendChild(b);
			tr.appendChild(c);
			bodyEl.appendChild(tr);
			lines.push(f[0] + ': ' + fmt(v) + (f[2] && typeof v === 'number' ? ' ' + f[2] : ''));
		});
		textEl.value = lines.join('\n');
	}

	function setEnv() {
		var m = /Chrome\/([0-9.]+)/.exec(navigator.userAgent);
		results.env_chrome = m ? m[1] : 'not available: no Chrome token in navigator.userAgent';
		results.env_window = window.innerWidth + ' x ' + window.innerHeight;
		results.env_dpr = window.devicePixelRatio;
		results.env_frame = frame.clientWidth + ' x ' + frame.clientHeight;
		results.env_screen = screen.width + ' x ' + screen.height;
	}

	function sizeFrame() {
		var v = sizeSel.value;
		if (v === 'fit') {
			frame.style.width = '100%';
			frame.style.height = '240px';
			var top = frame.getBoundingClientRect().top + window.pageYOffset;
			frame.style.height = Math.max(240, window.innerHeight - top - 4) + 'px';
		} else {
			var p = v.split('x');
			frame.style.width = p[0] + 'px';
			frame.style.height = p[1] + 'px';
		}
		setEnv();
		render();
	}

	function percentile(sorted, p) {
		if (sorted.length === 0) {
			return NaN;
		}
		var idx = Math.ceil(p * sorted.length) - 1;
		return sorted[Math.min(sorted.length - 1, Math.max(0, idx))];
	}

	// U-8: wrap the frame's console.log as soon as its window exists, before the engine starts.
	// Polled only while a load is under way (stopped at the frame's load event), so the 60 s
	// measurement runs with no polling. The original is still called, so other readers see every line.
	var wrapTimer = null;
	function wrapFrameConsole() {
		try {
			var win = frame.contentWindow;
			if (!win || win.__fvPerfWrapped) {
				return;
			}
			var orig = win.console.log;
			win.console.log = function () {
				try {
					if (arguments.length > 0 && typeof arguments[0] === 'string') {
						if (arguments[0].indexOf('fv:boot') === 0) {
							state.bootSeen = true;
						}
						if (lineHandler) {
							lineHandler(arguments[0]);
						}
					}
				} catch (e) { /* never break the game's logging */ }
				return orig.apply(this, arguments);
			};
			win.__fvPerfWrapped = true;
			try { win.performance.setResourceTimingBufferSize(2000); } catch (e) { /* none */ }
		} catch (e) { /* the window is not reachable yet */ }
	}
	function startWrapping() {
		state.frameLoaded = false;
		state.bootSeen = false;
		if (wrapTimer === null) {
			wrapTimer = setInterval(wrapFrameConsole, 2);
		}
	}
	function stopWrapping() {
		if (wrapTimer !== null) {
			clearInterval(wrapTimer);
			wrapTimer = null;
		}
	}
	frame.addEventListener('load', function () {
		wrapFrameConsole();
		stopWrapping();
		state.frameLoaded = true;
	});

	function setBusy(busy) {
		startBtn.disabled = busy;
		coldBtn.disabled = busy;
		reloadBtn.disabled = busy;
		sizeSel.disabled = busy;
	}

	function transferred() {
		try {
			var perf = frame.contentWindow.performance;
			var sum = 0;
			var n = 0;
			perf.getEntriesByType('navigation').forEach(function (e) { sum += e.transferSize || 0; n++; });
			perf.getEntriesByType('resource').forEach(function (e) { sum += e.transferSize || 0; n++; });
			if (n === 0) {
				return 'not available: the frame reported no navigation or resource entries';
			}
			return sum;
		} catch (e) {
			return 'not available: the frame performance entries could not be read (' + e.message + ')';
		}
	}

	function measure() {
		setBusy(true);
		state.measuring = true;
		state.measureDone = false;
		setStatus('Measuring for 60 s: fly right now');
		sizeFrame();
		var t0 = performance.now();
		var stamps = [];
		var steps = [];
		var tickLines = 0;
		var peak = -1;
		var longTasks = [];
		var observer = null;
		var ltReason = '';
		try {
			if (!window.PerformanceObserver || !PerformanceObserver.supportedEntryTypes || PerformanceObserver.supportedEntryTypes.indexOf('longtask') < 0) {
				ltReason = 'this browser does not report longtask entries';
			} else {
				observer = new PerformanceObserver(function (list) {
					list.getEntries().forEach(function (e) { longTasks.push(e); });
				});
				observer.observe({ type: 'longtask', buffered: true });
			}
		} catch (e) {
			ltReason = 'PerformanceObserver failed: ' + e.message;
		}
		lineHandler = function (text) {
			if (text.indexOf('fv:tick ') !== 0) {
				return;
			}
			var m = /(?:^| )step_us=([0-9,]+)(?: |$)/.exec(text);
			if (!m) {
				return;
			}
			tickLines++;
			m[1].split(',').forEach(function (s) {
				var n = Number(s);
				if (s !== '' && isFinite(n)) {
					steps.push(n);
				}
			});
		};
		function sampleHeap() {
			if (performance.memory && typeof performance.memory.usedJSHeapSize === 'number') {
				peak = Math.max(peak, performance.memory.usedJSHeapSize);
			}
		}
		sampleHeap();
		results.heap_used_start_mb = heapMb('usedJSHeapSize');
		var heapTimer = setInterval(sampleHeap, 1000);
		var last = null;
		function loop(ts) {
			if (last !== null) {
				stamps.push(ts - last);
			}
			last = ts;
			if (performance.now() - t0 < DURATION_MS) {
				requestAnimationFrame(loop);
			} else {
				finish();
			}
		}
		requestAnimationFrame(loop);

		function finish() {
			clearInterval(heapTimer);
			sampleHeap();
			results.heap_used_end_mb = heapMb('usedJSHeapSize');
			// Long task entries arrive asynchronously; give them a moment, then flush.
			setTimeout(function () {
				var tEnd = performance.now();
				if (observer) {
					observer.takeRecords().forEach(function (e) { longTasks.push(e); });
					observer.disconnect();
				}
				lineHandler = null;
				var sorted = stamps.slice().sort(function (a, b) { return a - b; });
				results.raf_frames = stamps.length;
				if (sorted.length === 0) {
					var why = 'not available: no rAF intervals were recorded (page hidden?)';
					['raf_median_ms', 'raf_p95_ms', 'raf_p99_ms', 'raf_over_33_3_count', 'raf_stalls_over_500_count'].forEach(function (k) { results[k] = why; });
				} else {
					results.raf_median_ms = percentile(sorted, 0.5);
					results.raf_p95_ms = percentile(sorted, 0.95);
					results.raf_p99_ms = percentile(sorted, 0.99);
					results.raf_over_33_3_count = sorted.filter(function (v) { return v > 33.3; }).length;
					results.raf_stalls_over_500_count = sorted.filter(function (v) { return v > 500; }).length;
				}
				if (ltReason) {
					results.longtask_over_100_count = 'not available: ' + ltReason;
					results.longtask_longest_ms = 'not available: ' + ltReason;
				} else {
					var mine = longTasks.filter(function (e) { return e.startTime >= t0 && e.startTime <= tEnd && e.duration > 100; });
					results.longtask_over_100_count = mine.length;
					results.longtask_longest_ms = mine.length === 0 ? 0 : Math.max.apply(null, mine.map(function (e) { return e.duration; }));
				}
				if (steps.length === 0) {
					var why2 = 'not available: no fv:tick lines (game not integrated yet)';
					results.step_us_samples = why2;
					results.step_us_p95 = why2;
					results.step_us_p99 = why2;
				} else {
					var ss = steps.slice().sort(function (a, b) { return a - b; });
					results.step_us_samples = steps.length;
					results.step_us_p95 = percentile(ss, 0.95);
					results.step_us_p99 = percentile(ss, 0.99);
				}
				results.peak_heap_mb = peak < 0 ? 'not available: performance.memory is missing (Chrome only)' : peak / 1048576;
				results.transferred_bytes = transferred();
				setEnv();
				render();
				state.measuring = false;
				state.measureDone = true;
				setBusy(false);
				setStatus('Measurement finished (' + tickLines + ' fv:tick lines seen)');
			}, 300);
		}
		try { frame.focus(); } catch (e) { /* none */ }
	}

	// Time from setting the frame src (or reloading it) to the first fv:boot line; falls back to the load event.
	function timedLoad(kind) {
		return new Promise(function (resolve) {
			var done = false;
			var tLoad = null;
			var t0 = 0;
			function finishWith(ms, basis) {
				if (done) {
					return;
				}
				done = true;
				lineHandler = null;
				resolve({ ms: ms, basis: basis });
			}
			function onLoad() {
				frame.removeEventListener('load', onLoad);
				if (tLoad === null) {
					tLoad = performance.now() - t0;
					setTimeout(function () {
						finishWith(tLoad, 'load event (no fv:boot within ' + (BOOT_WAIT_MS / 1000) + ' s)');
					}, BOOT_WAIT_MS);
				}
			}
			function go() {
				lineHandler = function (text) {
					if (text.indexOf('fv:boot') === 0) {
						finishWith(performance.now() - t0, 'fv:boot');
					}
				};
				startWrapping();
				frame.addEventListener('load', onLoad);
				t0 = performance.now();
				if (kind === 'reload') {
					try {
						frame.contentWindow.location.reload();
					} catch (e) {
						frame.src = frame.src;
					}
				} else {
					frame.src = srcParam;
				}
			}
			if (kind === 'reload') {
				go();
			} else {
				// A blank page first, so the next load starts from nothing.
				var onBlank = function () {
					frame.removeEventListener('load', onBlank);
					go();
				};
				frame.addEventListener('load', onBlank);
				frame.src = 'about:blank';
			}
		});
	}

	function cold() {
		setBusy(true);
		state.coldRunning = true;
		state.coldDone = false;
		var times = [];
		var bases = [];
		var chain = Promise.resolve();
		for (var i = 0; i < COLD_RUNS; i++) {
			(function (n) {
				chain = chain.then(function () {
					setStatus('Cold load ' + (n + 1) + ' of ' + COLD_RUNS);
					return timedLoad('cold').then(function (r) {
						times.push(r.ms);
						bases.push(r.basis);
						results['cold_load_' + (n + 1) + '_ms'] = r.ms;
						render();
					});
				});
			})(i);
		}
		chain = chain.then(function () {
			setStatus('Reload');
			return timedLoad('reload');
		}).then(function (r) {
			results.reload_ms = r.ms;
			bases.push(r.basis);
			var s = times.slice().sort(function (a, b) { return a - b; });
			results.cold_load_median_ms = s[Math.floor(s.length / 2)];
			results.cold_load_p95_ms = percentile(s, 0.95);
			results.cold_load_basis = bases.filter(function (b, i2) { return bases.indexOf(b) === i2; }).join('; ');
		}).catch(function (e) {
			['cold_load_1_ms', 'cold_load_2_ms', 'cold_load_3_ms', 'cold_load_4_ms', 'cold_load_5_ms', 'cold_load_median_ms', 'cold_load_p95_ms', 'reload_ms'].forEach(function (k) {
				if (typeof results[k] !== 'number') {
					results[k] = 'not available: ' + (e && e.message ? e.message : 'load timing failed');
				}
			});
			results.cold_load_basis = 'not available: load timing failed';
		}).then(function () {
			lineHandler = null;
			state.coldRunning = false;
			state.coldDone = true;
			setBusy(false);
			setStatus('Cold loads finished');
			setEnv();
			render();
		});
	}

	function loadGame() {
		startWrapping();
		frame.src = srcParam;
	}

	startBtn.addEventListener('click', measure);
	coldBtn.addEventListener('click', cold);
	reloadBtn.addEventListener('click', function () {
		sizeFrame();
		loadGame();
		setStatus('Game reloaded');
	});
	sizeSel.addEventListener('change', sizeFrame);
	window.addEventListener('resize', function () {
		if (sizeSel.value === 'fit') {
			sizeFrame();
		}
	});

	sizeFrame();
	loadGame();
})();
