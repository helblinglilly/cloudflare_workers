<script lang="ts">
  const { name, stroke = "none", fill = "none" } = $props();
</script>

{#if name === 'video'}
    <svg width="100%" height="100%" viewBox="0 0 512 512" version="1.1" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" xml:space="preserve" style="fill-rule:evenodd;clip-rule:evenodd;stroke-linecap:round;stroke-miterlimit:5;">
        <g transform="matrix(1.42305,0,0,1.42305,-121.313,-118.565)">
            <path d="M306.54,429.905L137.85,429.905C129.249,429.905 125.96,421.18 125.96,412.578L125.96,113.934C125.96,103.455 132.804,96.522 143.283,96.522L385.675,96.522C400.302,96.522 404.33,102.253 404.33,116.88L404.33,429.044" style={`fill:${fill};stroke:${stroke};stroke-width:14.05px;`}/>
        </g>
        <g transform="matrix(1.42305,0,0,1.42305,-144.027,-200.256)">
            <path d="M363.419,239.145L363.419,302.683C363.419,320.216 349.184,334.451 331.651,334.451L230.562,334.451C213.029,334.451 198.794,320.216 198.794,302.683L198.794,239.145C198.794,221.611 213.029,207.376 230.562,207.376L331.651,207.376C349.184,207.376 363.419,221.611 363.419,239.145Z" style={`fill:${fill};stroke:${stroke};stroke-width:14.05px;`}/>
        </g>
        <g transform="matrix(8.71364e-17,1.42305,-1.42305,8.71364e-17,600.118,-229.858)">
            <path d="M291.786,199.625C294.839,199.625 336.136,271.196 327.572,271.196L256,271.196C246.541,271.196 288.733,199.625 291.786,199.625Z" style={`fill:${fill};stroke:${stroke};stroke-width:14.05px;`}/>
        </g>
        <g transform="matrix(1.08518,0,0,1.08518,-31.731,-16.2581)">
            <path d="M182.832,358.583L347.458,358.583" style={`fill:${fill};stroke:${stroke};stroke-width:13.82px;`}/>
        </g>
        <g transform="matrix(1.08518,0,0,1.08518,-31.731,-46.7229)">
            <path d="M182.832,358.583L347.458,358.583" style={`fill:${fill};stroke:${stroke};stroke-width:13.82px;`}/>
        </g>
        <g transform="matrix(1.08518,0,0,1.08518,-31.731,12.8455)">
            <path d="M182.832,358.583L347.458,358.583" style={`fill:${fill};stroke:${stroke};stroke-width:13.82px;`}/>
        </g>
    </svg>
{/if}
