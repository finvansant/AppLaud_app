/* Copyright 2013 Chris Wilson

   Licensed under the Apache License, Version 2.0 (the "License");
   you may not use this file except in compliance with the License.
   You may obtain a copy of the License at

       http://www.apache.org/licenses/LICENSE-2.0

   Unless required by applicable law or agreed to in writing, software
   distributed under the License is distributed on an "AS IS" BASIS,
   WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
   See the License for the specific language governing permissions and
   limitations under the License.
*/

window.AudioContext = window.AudioContext || window.webkitAudioContext;

var audioContext = new AudioContext();
var audioInput = null,
    realAudioInput = null,
    inputPoint = null,
    audioRecorder = null;
var rafID = null;
var analyserContext = null;
var canvasWidth, canvasHeight;
var recIndex = 0;

/* TODO:

- offer mono option
- "Monitor input" switch
*/

function saveAudio() {
    audioRecorder.exportWAV( doneEncoding );
    // could get mono instead by saying
    // audioRecorder.exportMonoWAV( doneEncoding );
}

function gotBuffers( buffers ) {
    var canvas = document.getElementById( "recording" );

    drawBuffer( canvas.width, canvas.height, canvas.getContext('2d'), buffers[0] );

    // the ONLY time gotBuffers is called is right after a new recording is completed - 
    // so here's where we should set up the download.
    audioRecorder.exportWAV( doneEncoding );
}

function doneEncoding( blob ) {
    Recorder.setupDownload( blob, "myRecording" + ((recIndex<10)?"0":"") + recIndex + ".wav" );
    recIndex++;
}

//keypress on spacebar clicks the record button
// $(function() {

//   // $(document).keypress(function(evt) {
//   //   if (evt.keyCode == 32) {
//   //     $('#record').click();
//   //   }
//   // });
// })

function switchBtn(){
    $('#record').toggleClass('start stop');
    $('#record span').toggleClass('glyphicon-record glyphicon-stop');
}


// $(function() {


//     document.addEventListener("change", function(){
//         console.log("DVF");
//     //document.getElementById("demo").innerHTML = "Hello World";
//     });

//   //   $('.rec-name').focus(function(event){
//   //   console.log(event);
//   // });
//   // $(document).keypress(function(evt) {
//   //   if (evt.keyCode == 32) {
//   //     $('#record').click();
//   //   }
//   // });
// })



// function winner(data)

var counter = 0
function toggleRecording( e ) {
    $('#intro').fadeOut('slow');

    if (e.classList.contains("recording")) {
        // stop recording
       // $('#nameModal').modal('show');
        switchBtn();
        audioRecorder.stop();
        e.classList.remove("recording");
        audioRecorder.getBuffers( gotBuffers );
        counter ++;
        $("#recording").attr('id', 'recording'+counter);
        var canvas = document.getElementById("viz2");

        $(".add-recording").hide().append(
            "<li id='new-recording"+counter+
            "' class='box col-xs-12 col-lg-4'>"+
            "<div class='panel'>"+
            "<input type='text' placeholder='Enter Name' class='rec-name' >"+
            "<span class='glyphicon glyphicon-pencil' aria-hidden='true'></span>"+
            "<div id='"+counter+
            "' class='btn' onClick='deleteRecording(this.id)'><span class='glyphicon glyphicon-remove-circle' aria-hidden='true'></span></div>"+
            "<div class='row'>"+
            "<section class='rec-canvas col-xs-12 col-lg-9'>"+
            "<canvas id='recording' width='1024' height='400'></canvas></section>"+
            "<section class='rec-score col-xs-12 col-lg-3'><h3>Score:</h3>"+
            "<h1 class='score'></h1></section></div>"+
            "<section class='rec-info'><ul>"+
            "<li>Length of recording:"+
            "<span class='time'></span>"+
            "</li><li>Hits above 0.1 pcm:"+
            "<span class='hits'></span></li></ul></section>"+
            "</div></li>"
            ).fadeIn('slow');


        //hides all scores
        $('.rec-score').hide();
    } else {
        // start recording
        switchBtn();
        if (!audioRecorder)
            return;
        e.classList.add("recording");
        audioRecorder.clear();
        audioRecorder.record();
    }
}



function deleteRecording(recording_id)
{
    $( "#new-recording"+recording_id ).remove();
}



function toggleResults( e ) {
    $('#resultBody').empty();
    var numericallyOrderedScores = [];
    var newArray = [];
    var result = '';
  // console.log(getSorted('.score', 'id'));



    numericallyOrderedScores = $('.box').sort(function (a, b) {
        return $(a).find(".score").text() < $(b).find(".score").text();
    });

   // var result = function sort(numericallyOrderedScores) {
   //    numericallyOrderedScores.concat().sort();
   // }

   //   $('#resultBody').html(result);

    // var result = numericallyOrderedScores[0];
    // $('#resultBody').html(newArray);

    // //var newArray = numericallyOrderedScores.clone();
    // //var result = newArray.slice(0,1);
    // //$('#resultBody').html(result);
    // <ol>
    // <li>Name:<span>Score:</span></li>
    // <li>Team 1 <span>34</span></li>
    // </ol>
    

  //var data =   numericallyOrderedScores[0].find($('.panel'));
 // JON's=> $(result).clone().appendTo('#resultBody');

   
   
   $('.rec-score').fadeIn();
}

function convertToMono( input ) {
    var splitter = audioContext.createChannelSplitter(2);
    var merger = audioContext.createChannelMerger(2);

    input.connect( splitter );
    splitter.connect( merger, 0, 0 );
    splitter.connect( merger, 0, 1 );
    return merger;
}

function cancelAnalyserUpdates() {
    window.cancelAnimationFrame( rafID );
    rafID = null;
}

function updateAnalysers(time) {
    if (!analyserContext) {
        var canvas = document.getElementById("display");
        canvasWidth = canvas.width;
        canvasHeight = canvas.height;
        analyserContext = canvas.getContext('2d');
    }

    // analyzer draw code here
    {
        var SPACING = 3;
        var BAR_WIDTH = 1;
        var numBars = Math.round(canvasWidth / SPACING);
        var freqByteData = new Uint8Array(analyserNode.frequencyBinCount);

        analyserNode.getByteFrequencyData(freqByteData); 

        analyserContext.clearRect(0, 0, canvasWidth, canvasHeight);
        analyserContext.fillStyle = '#F6D565';
        analyserContext.lineCap = 'round';
        var multiplier = analyserNode.frequencyBinCount / numBars;

        // Draw rectangle for each frequency bin.
        for (var i = 0; i < numBars; ++i) {
            var magnitude = 0;
            var offset = Math.floor( i * multiplier );
            // gotta sum/average the block, or we miss narrow-bandwidth spikes
            for (var j = 0; j< multiplier; j++)
                magnitude += freqByteData[offset + j];
            magnitude = magnitude / multiplier;
            var magnitude2 = freqByteData[i * multiplier];
            analyserContext.fillStyle = "hsl( " + Math.round((i*360)/numBars) + ", 100%, 50%)";
            analyserContext.fillRect(i * SPACING, canvasHeight, BAR_WIDTH, -magnitude);
        }
    }
    
    rafID = window.requestAnimationFrame( updateAnalysers );
}

function toggleMono() {
    if (audioInput != realAudioInput) {
        audioInput.disconnect();
        realAudioInput.disconnect();
        audioInput = realAudioInput;
    } else {
        realAudioInput.disconnect();
        audioInput = convertToMono( realAudioInput );
    }

    audioInput.connect(inputPoint);
}

function gotStream(stream) {
    inputPoint = audioContext.createGain();

    // Create an AudioNode from the stream.
    realAudioInput = audioContext.createMediaStreamSource(stream);
    audioInput = realAudioInput;
    audioInput.connect(inputPoint);

    // audioInput = convertToMono( input );

    analyserNode = audioContext.createAnalyser();
    analyserNode.fftSize = 2048;
    inputPoint.connect( analyserNode );

    audioRecorder = new Recorder( inputPoint );

    zeroGain = audioContext.createGain();
    zeroGain.gain.value = 0.0;
    inputPoint.connect( zeroGain );
    zeroGain.connect( audioContext.destination );
    updateAnalysers();
}

function initAudio() {
        if (!navigator.getUserMedia)
            navigator.getUserMedia = navigator.webkitGetUserMedia || navigator.mozGetUserMedia;
        if (!navigator.cancelAnimationFrame)
            navigator.cancelAnimationFrame = navigator.webkitCancelAnimationFrame || navigator.mozCancelAnimationFrame;
        if (!navigator.requestAnimationFrame)
            navigator.requestAnimationFrame = navigator.webkitRequestAnimationFrame || navigator.mozRequestAnimationFrame;

    navigator.getUserMedia(
        {
            "audio": {
                "mandatory": {
                    "googEchoCancellation": "false",
                    "googAutoGainControl": "false",
                    "googNoiseSuppression": "false",
                    "googHighpassFilter": "false"
                },
                "optional": []
            },
        }, gotStream, function(e) {
            alert('Error getting audio');
            console.log(e);
        });
}

window.addEventListener('load', initAudio );


//disables input after enter
function getName(){
    $(".rec-name").each(function() {
        var val = $(this).val();
        if(val != "") {
            //adds disabled
            $(this).prop('disabled', true);
            //adds edit button
            $(this).next().fadeIn('slow');   
        }
    });      
}

document.addEventListener('change', getName );

//edits name
$(document).on('click', '.glyphicon-pencil', function (){
   $(this).fadeOut('slow');
   $(this).prev().prop("disabled", false).focus();
});






















