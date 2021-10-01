
function game_save()
{
    var data = {
        id:$('#txtId').val(),
        reward_question: $('#txtRewardQuestion').val(),
        cost_plinko:$('#txtCostPlinko').val(),
        rewards_plinko:[$('#txtRewardPlinko0').val(),
            $('#txtRewardPlinko1').val(),
            $('#txtRewardPlinko2').val(),
            $('#txtRewardPlinko3').val(),
            $('#txtRewardPlinko4').val(),
            $('#txtRewardPlinko5').val(),
            $('#txtRewardPlinko6').val(),
            $('#txtRewardPlinko7').val(),
            $('#txtRewardPlinko8').val()
        ],
        reg_coins: $('#txtRewardRegCoins').val(),
        reg_tokens: $('#txtRewardRegTokens').val(),
        reg_tickets: $('#txtRewardRegTickets').val(),
        questions_limit: $("#txtLimitQuestion").val(),
        questions_limit_text: $('#txtLimitQuestionText').val(),
        questions_correct_limit: $("#txtLimitCorrectQuestion").val(),
        questions_correct_limit_text: $('#txtLimitCorrectQuestionText').val(),

    };
    console.log(data);

    data.min_reward_plinko = Math.min.apply(null,data.rewards_plinko);
     $.post( "/admin/api/game/", data, function( result )
     {
         //alert(JSON.stringify(result));
         location.reload();
     });
}
function game_cancel(){
    location.reload();
}

function game_remove()
{
    $.ajax({
        url:  "/admin/api/game/" + $('#txtId').val(),
        type: 'DELETE',
        success: function(result)
        {
            location.reload();
        }
    });
}

function ticket_remove()
{
    $.ajax({
        url:  "/admin/api/ticket/" + $('#txtId').val(),
        type: 'DELETE',
        success: function(result)
        {
            location.reload();
        }
    });
}