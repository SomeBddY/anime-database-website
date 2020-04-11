$(document).ready(function(){
  $('#select-rating').change(function(){
    $('#rate-btn').prop('disabled', this.value == 0);
  }).change();
});
