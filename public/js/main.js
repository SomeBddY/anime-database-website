$(document).ready(function(){
  $('.delete-anime').on('click', function(e) {
    $target = $(e.target);
    const id = $target.attr('data-id');

    $.ajax({
      url: '/anime/'+id,
      type: 'DELETE',
      success: function(response){
        window.location.href='/';
      },
      error: function(err){
        console.log(err);
      }
    });
  });

  $('.delete-manga').on('click', function(e) {
    $target = $(e.target);
    const id = $target.attr('data-id');

    $.ajax({
      url: '/manga/'+id,
      type: 'DELETE',
      success: function(response){
        window.location.href='/';
      },
      error: function(err){
        console.log(err);
      }
    });
  });

  $('.delete-liveaction').on('click', function(e) {
    $target = $(e.target);
    const id = $target.attr('data-id');

    $.ajax({
      url: '/liveaction/'+id,
      type: 'DELETE',
      success: function(response){
        window.location.href='/';
      },
      error: function(err){
        console.log(err);
      }
    });
  });

  $('.delete-game').on('click', function(e) {
    $target = $(e.target);
    const id = $target.attr('data-id');

    $.ajax({
      url: '/game/'+id,
      type: 'DELETE',
      success: function(response){
        window.location.href='/';
      },
      error: function(err){
        console.log(err);
      }
    });
  });

  $('#select-rating').change(function(){
    $('#rate-btn').prop('disabled', this.value == 0);
  }).change();
});
