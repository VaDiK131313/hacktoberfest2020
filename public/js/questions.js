function question_save() {
    var data = {
        question: $('#txtQuestion').val(),
        answers: [{Answer: "ww", IsTrue: true}],
        active: $('#txtActive').val(),
        labels: $('#txtLabels').val().replace(/\ {1,}/g,"").trim()
    };
    var answers = [];
    $('input.answer-input').each(function () {
        answers.push({Answer: $(this).val(), IsTrue: false});
    });

    var warning = "Please,";
    if (data.question.length == 0) {
        warning += " Set a question text.\n";
    }
    if (data.answers.length == 0) {
        warning += " Add one more answer for question.\n";
    }

    if (answers.length > 0) {
        var index = $('input[type=radio]:checked').val();
        if (index == undefined) {
            answers[0].IsTrue = true;
        }
        else
            answers[index].IsTrue = true;
        data.answers = JSON.stringify(answers);

        var id = $('#txtId').val();

        if (warning != "Please,") {
            return alert(warning);

        }
        if (id.length > 0) {


            $.post("/admin/question/" + $('#txtId').val() + "/", data, function (result) {
                location.reload();
            });
        }
        else {
            $.post(" /admin/api/questions/create", data, function (result) {
                location.reload();
            });

        }

    }
    else {
        if(warning != "Please,")
        {
            return alert(warning);
        }
    }
}


function question_remove() {
    $.ajax({
        url: "/admin/api/questions/" + $('#txtId').val(),
        type: 'DELETE',
        success: function (result) {
            location.reload();
        }
    });
}
var count=0;
function remove_questions() {
    var selected_players = [];
    var data = {};
    data.ids = [];
    //document.getElementsByName("user_select");
    $("input[name='user_select']:checked").each(function () {
        selected_players.push($(this).val());
        data.ids.push($(this).val());
    });

    if(data.ids.length >= 1000) {
        var plen = Math.ceil(data.ids.length / 200);


        var result = splitTo(data.ids, plen);
        console.log(result);
        for(var i = 0;i < result.length; i++)
        {
            var body = {
                ids:result[i],
            };

            $.post("/admin/api/remove/questions/", body, function (res) {
                count++;
                if(count >= result.length)
                {
                    location.reload();
                }
            });
        }

    }
    else{
        $.post("/admin/api/remove/questions/", data, function (result) {
            location.reload();
        });
    }


}

function set_active_questions(active) {
    var selected_players = [];
    var data = {};
    data.ids = [];
    data.active = active;
    //document.getElementsByName("user_select");
    $("input[name='user_select']:checked").each(function () {
        selected_players.push($(this).val());
        data.ids.push($(this).val());
    });

    if(data.ids.length >= 1000) {
        var plen = Math.ceil(data.ids.length / 200);


        var result = splitTo(data.ids, plen);
            console.log(result);
        for(var i = 0;i < result.length; i++)
        {
            var body = {
                ids:result[i],
                active:active,
            };

                $.post("/admin/api/setactive/questions/", body, function (res) {
                    count++;
                    if(count >= result.length)
                    {
                        location.reload();
                    }
            });
        }
    }else
        {
            $.post("/admin/api/setactive/questions/", data, function (result) {
               location.reload();
            });
        }

    // if(selected_players.length > 0) {


    // }
}
var index=0;
function splitTo( arr, n) {
    var plen = Math.ceil(arr.length / n);

    return arr.reduce( function( p, c, i, a) {
        if(i%plen === 0) {
            p.push([]);
            index = 0;
        }

        p[p.length-1][index] = c;
        index++;
        return p;
    }, []);
}


function upload_questions() {
    var data = {};
    //document.getElementsByName("user_select");
    var file = $("input[name='file']").prop('files');
    var formData = new FormData();
    formData.append('file', $("input[name='file']").prop('files')[0]);

    $.ajax({
        url: '/admin/uploadcsv',
        type: 'POST',
        data: formData,
        processData: false,  // tell jQuery not to process the data
        contentType: false,  // tell jQuery not to set contentType
        success: function (data) {
            location.reload();
        }
    });
}


function select_all(source) {
    checkboxes = document.getElementsByName('user_select');
    for (var i = 0; i < checkboxes.length; i++) {
        checkboxes[i].checked = source.checked;
    }

}
