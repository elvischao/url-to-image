'use strict';

// PhantomJS script
// Takes screeshot of a given page. This correctly handles pages which
// dynamically load content making AJAX requests.

// Instead of waiting fixed amount of time before rendering, we give a short
// time for the page to make additional requests.

// Phantom internals
const system = require('system');
const webPage = require('webpage');

function main() {
    // I tried to use yargs as a nicer commandline option parser but
    // it doesn't run in phantomjs environment
    const args = system.args;
    const opts = {
        url: args[1],
        filePath: args[2],
        width: args[3],
        height: args[4],
        requestTimeout: args[5],
        maxTimeout: args[6],
        verbose: args[7] === 'true',
        fileType: args[8],
        fileQuality: args[9] ? args[9] : 100,
        cropWidth: args[10],
        cropHeight: args[11],
        cropOffsetLeft: args[12] ? args[12] : 0,
        cropOffsetTop: args[13] ? args[13] : 0
    };

    renderPage(opts);
}

function renderPage(opts) {
    let requestCount = 0;
    let forceRenderTimeout;
    let dynamicRenderTimeout;

    const page = webPage.create();
    page.viewportSize = {
        width: opts.width,
        height: opts.height
    };
    // Silence confirmation messages and errors
    page.onConfirm = page.onPrompt = function noOp() {};
    page.onError = function(err) {
        log('Page error:', err);
    };

    page.onResourceRequested = function(request) {
        log('->', request.method, request.url);
        requestCount += 1;
        clearTimeout(dynamicRenderTimeout);
    };

    page.onResourceReceived = function(response) {
        if (!response.stage || response.stage === 'end') {
            log('<-', response.status, response.url);
            requestCount -= 1;
            if (requestCount === 0) {
                dynamicRenderTimeout = setTimeout(renderAndExit, opts.requestTimeout);
            }
        }
    };

    page.open(opts.url, function(status) {
        if (status !== 'success') {
            log('Unable to load url:', opts.url);
            phantom.exit(10);
        } else {
            forceRenderTimeout = setTimeout(renderAndExit, opts.maxTimeout);
        }
    });

    function log() {
        // PhantomJS doesn't stringify objects very well, doing that manually
        if (opts.verbose) {
            let args = Array.prototype.slice.call(arguments);

            let str = '';
            args.forEach(function(arg) {
                if (isString) {
                    str += arg;
                } else {
                    str += JSON.stringify(arg, null, 2);
                }

                str += ' '
            });

            console.log(str);
        }
    }

    function renderAndExit() {
        log('Render screenshot..');
        if(opts.cropWidth && opts.cropHeight) {
        log("Cropping...");
            page.clipRect = {top: opts.cropOffsetTop, left: opts.cropOffsetLeft, width: opts.cropWidth, height: opts.cropHeight};
        }

        let renderOpts = {
            fileQuality: opts.fileQuality
        };

        if(opts.fileType) {
            log("Adjusting File Type...");
            renderOpts.fileType = opts.fileType;
        }

        page.render(opts.filePath, renderOpts);
        log('Done.');
        phantom.exit();
    }
}

function isString(value) {
    return typeof value === 'string'
}

main();
