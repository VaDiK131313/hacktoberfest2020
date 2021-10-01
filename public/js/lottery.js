
function lottery_save()
{

    var data = {
        id:$('#txtId').val(),
        cost:$('#txtCost').val(),
        name:$('#txtName').val(),
        availableAt:(new Date($('#txtAvailableAt').val())),
        jackpotLimit:$('#txtJackpotLimit').val().length == 0 ? 10 : $('#txtJackpotLimit').val(),
        repeat:$('#txtRepeat').val(),
        beginAt:$('#txtBeginAt').val()};

    $.post( "/admin/api/lottery/", data, function( result )
    {
        location.reload();
    });
}


function lottery_remove()
{
    $.ajax({
        url:  "/admin/api/lottery/" + $('#txtId').val(),
        type: 'DELETE',
        success: function(result)
        {
            location.reload();
        }
    });
}
