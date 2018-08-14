execute = function (file) {
    reader = new FileReader();
    var value = undefined;
    if (method.update) {
        var batch = 1024 * 1024 * 2;
        var start = 0;
        var total = file.file.size;
        var current = method;
        reader.onload = function (event) {
            try {
                current = current.update(event.target.result, value);
                asyncUpdate();
            } catch (e) {
                console.log(e);
            }
        };
        var asyncUpdate = function () {
            if (start < total) {
                console.log('hashing...' + (start / total * 100).toFixed(2) + '%');
                var end = Math.min(start + batch, total);
                reader.readAsArrayBuffer(file.file.slice(start, end));
                start = end;
            } else {
                console.log(current.hex());
                fetch('/check/' + current.hex())
                    .then(function (response) {
                        return response.json();
                    })
                    .then(function (result) {
                        if (result.response == 200) {
                            r.cancel();
                            $('#upload-processing').css({
                              width: "100%"
                            });
                            $('#upload-processing').html(
                              '100%');
                            document.getElementById("upload-processing").classList.remove("progress-bar-animated");
                            $('.flow-file-progress').text('(completed)');
                            $("#videohash").val(result.hash);
                            $('#publish').show();
                        }
                    });
            }
        };
        asyncUpdate();
    } else {
        console.log('hashing...');
        reader.onload = function (event) {
            try {
                console.log(method(event.target.result, value));
            } catch (e) {
                console.log(e);
            }
        };
        reader.readAsArrayBuffer(file.file);
    }
};